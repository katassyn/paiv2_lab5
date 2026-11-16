// Unit testy logiki biznesowej rezerwacji: repositories in-memory (bez bazy), wstrzyknięty czas,
// event bus zastąpiony szpiegiem jest.fn(). Każdy test buduje własny stan przez setup().
const { createReservationsService } = require('../../src/modules/reservations/reservations.service');
const { createInMemoryUnitOfWork } = require('../../src/db/unitOfWork.memory');

const NOW = new Date('2027-03-01T08:00:00Z');
const DAY = '2027-03-10';
const at = (hhmm) => `${DAY}T${hhmm}:00Z`;

const owner = { id: 2, role: 'USER' }; // Jan
const otherUser = { id: 3, role: 'USER' }; // Anna
const admin = { id: 1, role: 'ADMIN' };

// sala 1 (A101) ma pojemność 30, sala 2 (A102) 15
const reservation = (id, { roomId = 1, start = '10:00', end = '12:00', status = 'CONFIRMED', userId = owner.id } = {}) => ({
  id,
  roomId,
  userId,
  participants: 10,
  startTime: new Date(at(start)),
  endTime: new Date(at(end)),
  status,
  createdAt: NOW,
  cancelledAt: status === 'CANCELLED' ? NOW : null,
  internalNote: 'test',
});

function setup({ reservations = [], clock = { now: NOW } } = {}) {
  const { runInTransaction } = createInMemoryUnitOfWork({ reservations });
  const eventBus = { publish: jest.fn(), subscribe: jest.fn() };
  const service = createReservationsService({ runInTransaction, eventBus, now: () => clock.now });
  return { service, eventBus };
}

const input = (start, end, { roomId = 1, participants = 10 } = {}) => ({
  roomId,
  participants,
  startTime: at(start),
  endTime: at(end),
});

describe('createReservation: nakładanie się przedziałów (istniejąca: sala 1, 10:00-12:00)', () => {
  test.each([
    ['nakładanie częściowe od początku', '09:00', '11:00'],
    ['nakładanie częściowe od końca', '11:00', '13:00'],
    ['nowa zawiera istniejącą', '09:00', '13:00'],
    ['nowa zawiera się w istniejącej', '10:30', '11:00'],
    ['identyczny przedział', '10:00', '12:00'],
  ])('%s (%s-%s) -> 409 ROOM_ALREADY_BOOKED', async (_name, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input(start, end), owner))
      .rejects.toMatchObject({ statusCode: 409, code: 'ROOM_ALREADY_BOOKED' });
  });

  test.each([
    ['kończy się, gdy istniejąca się zaczyna', '08:00', '10:00'],
    ['zaczyna się, gdy istniejąca się kończy', '12:00', '13:00'],
  ])('przedziały stykające się są dozwolone: %s (%s-%s)', async (_name, start, end) => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input(start, end), owner))
      .resolves.toMatchObject({ status: 'CONFIRMED' });
  });

  test('ten sam przedział w innej sali jest dozwolony', async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input('10:00', '12:00', { roomId: 2 }), owner))
      .resolves.toMatchObject({ roomId: 2, status: 'CONFIRMED' });
  });

  test('rezerwacja CANCELLED nie blokuje przedziału', async () => {
    const { service } = setup({ reservations: [reservation(1, { status: 'CANCELLED' })] });

    await expect(service.createReservation(input('10:00', '12:00'), owner))
      .resolves.toMatchObject({ status: 'CONFIRMED' });
  });
});

describe('createReservation: pojemność sali (sala 1: 30 miejsc)', () => {
  test('participants == capacity jest dozwolone', async () => {
    const { service } = setup();

    await expect(service.createReservation(input('10:00', '11:00', { participants: 30 }), owner))
      .resolves.toMatchObject({ participants: 30 });
  });

  test('capacity + 1 -> 409 ROOM_CAPACITY_EXCEEDED', async () => {
    const { service } = setup();

    await expect(service.createReservation(input('10:00', '11:00', { participants: 31 }), owner))
      .rejects.toMatchObject({ statusCode: 409, code: 'ROOM_CAPACITY_EXCEEDED' });
  });
});

describe('createReservation: czas trwania (15 min - 8 h)', () => {
  test.each([
    ['dokładnie 15 min', '10:00', '10:15'],
    ['dokładnie 8 h', '08:00', '16:00'],
  ])('%s jest dozwolone', async (_name, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input(start, end), owner)).resolves.toMatchObject({ status: 'CONFIRMED' });
  });

  test.each([
    ['14 min', '10:00', '10:14'],
    ['8 h 1 min', '08:00', '16:01'],
  ])('%s -> 400 VALIDATION_ERROR', async (_name, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input(start, end), owner))
      .rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });
});

describe('cancelReservation', () => {
  test('rozpoczętej rezerwacji nie można anulować -> 409 RESERVATION_ALREADY_STARTED', async () => {
    const clock = { now: new Date(at('11:00')) }; // rezerwacja 10:00-12:00 już trwa
    const { service } = setup({ reservations: [reservation(1)], clock });

    await expect(service.cancelReservation(1, owner))
      .rejects.toMatchObject({ statusCode: 409, code: 'RESERVATION_ALREADY_STARTED' });
  });

  test('podwójne anulowanie jest idempotentne: cancelledAt się nie zmienia', async () => {
    const clock = { now: NOW };
    const { service } = setup({ reservations: [reservation(1)], clock });

    const first = await service.cancelReservation(1, owner);
    clock.now = new Date('2027-03-02T09:00:00Z'); // drugie wywołanie dzień później
    const second = await service.cancelReservation(1, owner);

    expect(first.status).toBe('CANCELLED');
    expect(second.status).toBe('CANCELLED');
    expect(second.cancelledAt).toEqual(first.cancelledAt);
    expect(second.cancelledAt).toEqual(NOW);
  });
});

describe('ownership', () => {
  test('obcy USER nie widzi cudzej rezerwacji -> 404 NOT_FOUND', async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.getReservation(1, otherUser)).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  test('obcy USER nie może anulować cudzej rezerwacji -> 404 NOT_FOUND', async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.cancelReservation(1, otherUser)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  test('ADMIN może pobrać i anulować cudzą rezerwację', async () => {
    const { service } = setup({ reservations: [reservation(1)] });

    await expect(service.getReservation(1, admin)).resolves.toMatchObject({ id: 1, userId: owner.id });
    await expect(service.cancelReservation(1, admin)).resolves.toMatchObject({ status: 'CANCELLED' });
  });
});

describe('eventy', () => {
  test('po udanym utworzeniu publikuje reservation.created', async () => {
    const { service, eventBus } = setup();

    const created = await service.createReservation(input('10:00', '11:00'), owner);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith('reservation.created', {
      reservationId: created.id,
      roomId: 1,
      userId: owner.id,
      startTime: '2027-03-10T10:00:00.000Z',
      endTime: '2027-03-10T11:00:00.000Z',
    });
  });

  test('nieudana operacja (409) nie publikuje eventu', async () => {
    const { service, eventBus } = setup({ reservations: [reservation(1)] });

    await expect(service.createReservation(input('11:00', '13:00'), owner)).rejects.toMatchObject({ code: 'ROOM_ALREADY_BOOKED' });
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test('anulowanie publikuje reservation.cancelled, a ponowne anulowanie już nie', async () => {
    const { service, eventBus } = setup({ reservations: [reservation(1)] });

    await service.cancelReservation(1, admin);
    await service.cancelReservation(1, admin);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith('reservation.cancelled', {
      reservationId: 1,
      roomId: 1,
      userId: owner.id,
      cancelledBy: admin.id,
    });
  });
});
