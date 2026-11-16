const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../../errors/AppError');
const { noopEventBus } = require('../../events/eventBus');

const MIN_DURATION_MS = 15 * 60 * 1000; // 15 minut
const MAX_DURATION_MS = 8 * 60 * 60 * 1000; // 8 godzin

// State machine: dozwolone przejścia statusów zapisane jako dane.
const ALLOWED_TRANSITIONS = {
  CONFIRMED: ['CANCELLED'],
  CANCELLED: [], // stan końcowy
};

// Przedziały półotwarte [start, end): nakładają się, gdy A.start < B.end AND B.start < A.end
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

const isAdmin = (user) => user.role === 'ADMIN';

// Ownership: właściciel albo ADMIN. Dla innego USERa rezerwacja "nie istnieje" (404, a nie 403),
// bo rezerwacje są prywatne i nie zdradzamy nawet tego, że dane ID jest zajęte.
function assertCanAccess(reservation, currentUser) {
  if (!reservation || (reservation.userId !== currentUser.id && !isAdmin(currentUser))) {
    throw new NotFoundError('Reservation');
  }
}

function createReservationsService({ runInTransaction, eventBus = noopEventBus, now = () => new Date() }) {
  async function createReservation(input, currentUser) {
    const start = new Date(input.startTime).getTime();
    const end = new Date(input.endTime).getTime();
    const current = now().getTime();

    // Reguły czasowe -> 400
    if (end <= start) {
      throw new ValidationError([
        { location: 'body', field: 'endTime', message: 'endTime must be later than startTime' },
      ]);
    }
    const duration = end - start;
    if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
      throw new ValidationError([
        { location: 'body', field: 'endTime', message: 'Reservation must last between 15 minutes and 8 hours' },
      ]);
    }
    if (start < current) {
      throw new ValidationError([
        { location: 'body', field: 'startTime', message: 'startTime cannot be in the past' },
      ]);
    }

    // Sprawdzenie kolizji i zapis w JEDNEJ transakcji
    const created = await runInTransaction(async ({ rooms, reservations }) => {
      // Blokada wiersza sali (SELECT ... FOR UPDATE): równoległe rezerwacje TEJ SAMEJ sali
      // czekają tu, aż poprzednia transakcja zrobi COMMIT. Inne sale nie są blokowane.
      await rooms.lockById(input.roomId);

      // Sala musi istnieć -> 404
      const room = await rooms.findById(input.roomId);
      if (!room) throw new NotFoundError('Room');

      // Pojemność sali -> 409
      if (input.participants >= room.capacity) {
        throw new ConflictError('Room capacity exceeded', 'ROOM_CAPACITY_EXCEEDED');
      }

      // Brak nakładających się aktywnych rezerwacji -> 409
      const active = await reservations.findByRoomAndStatus(room.id, 'CONFIRMED');
      const collision = active.some((r) =>
        overlaps(start, end, new Date(r.startTime).getTime(), new Date(r.endTime).getTime())
      );
      if (collision) {
        throw new ConflictError('Room is already booked in this time range', 'ROOM_ALREADY_BOOKED');
      }

      return reservations.create({
        roomId: room.id,
        userId: currentUser.id, // właściciel wyłącznie z tokenu, nigdy z body
        participants: input.participants,
        startTime: new Date(start),
        endTime: new Date(end),
        status: 'CONFIRMED',
        createdAt: now(),
        internalNote: 'created via API v2',
      });
    });

    // Event dopiero PO COMMIT: nieudana operacja (wyjątek) nie dochodzi do tego miejsca.
    eventBus.publish('reservation.created', {
      reservationId: created.id,
      roomId: created.roomId,
      userId: created.userId,
      startTime: new Date(created.startTime).toISOString(),
      endTime: new Date(created.endTime).toISOString(),
    });
    return created;
  }

  async function listReservations(query, currentUser) {
    const filters = { ...query };

    if (!isAdmin(currentUser)) {
      // ?userId= jest filtrem administracyjnym: USER dostaje jawne 403 zamiast cichego zignorowania
      if (query.userId !== undefined) {
        throw new ForbiddenError('Filtering by userId is available only for ADMIN');
      }
      filters.userId = currentUser.id; // USER widzi tylko swoje, niezależnie od parametrów query
    }

    return runInTransaction(async ({ reservations }) => {
      const { items, total } = await reservations.list(filters);
      return {
        items,
        meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
      };
    });
  }

  async function getReservation(id, currentUser) {
    return runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      assertCanAccess(reservation, currentUser);
      return reservation;
    });
  }

  async function cancelReservation(id, currentUser) {
    let changed = false;
    const result = await runInTransaction(async ({ reservations }) => {
      const reservation = await reservations.findById(id);
      assertCanAccess(reservation, currentUser);
      const target = 'CANCELLED';

      // Idempotencja: ponowne anulowanie zwraca rezerwację bez zmian (i bez eventu)
      if (reservation.status === target) return reservation;

      if (!ALLOWED_TRANSITIONS[reservation.status].includes(target)) {
        throw new ConflictError(
          `Cannot change status from ${reservation.status} to ${target}`,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Reguła obowiązuje również ADMINa
      if (new Date(reservation.startTime).getTime() <= now().getTime()) {
        throw new ConflictError('Reservation has already started', 'RESERVATION_ALREADY_STARTED');
      }

      changed = true;
      return reservations.update(id, { status: target, cancelledAt: now() });
    });

    if (changed) {
      eventBus.publish('reservation.cancelled', {
        reservationId: result.id,
        roomId: result.roomId,
        userId: result.userId,
        cancelledBy: currentUser.id,
      });
    }
    return result;
  }

  return { createReservation, listReservations, getReservation, cancelReservation };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS, overlaps };
