const request = require('supertest');
const { app, db, migrate, resetDatabase, registerAndLogin, login, waitForAuditLog } = require('./testApp');

// przyszły termin, niezależny od dnia uruchomienia testów
const slot = (start, end, roomId = 1, participants = 10) => ({
  roomId,
  participants,
  startTime: `2030-01-10T${start}:00Z`,
  endTime: `2030-01-10T${end}:00Z`,
});

beforeAll(migrate);
beforeEach(resetDatabase);
afterAll(() => db.destroy()); // zamyka pulę połączeń: Jest kończy się bez open handles

describe('Auth', () => {
  test('rejestracja + logowanie + GET /api/auth/me', async () => {
    const token = await registerAndLogin('Jan.Kowalski@Example.com');

    const res = await request(app).get('/api/auth/me').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: 'jan.kowalski@example.com', role: 'USER' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  test('401 bez tokenu', async () => {
    const res = await request(app).get('/api/reservations');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('Reservations API', () => {
  test('POST /api/reservations -> 201, nagłówek Location i rekord w bazie', async () => {
    const jan = await registerAndLogin('jan@example.com');

    const res = await request(app).post('/api/reservations').set('Authorization', jan).send(slot('10:00', '12:00'));

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
    const row = await db('reservations').where({ id: res.body.id }).first();
    expect(row).toMatchObject({ room_id: 1, user_id: 2, participants: 10, status: 'CONFIRMED' });
  });

  test('400 z poprawnymi details dla błędnego body', async () => {
    const jan = await registerAndLogin('jan@example.com');

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', jan)
      .send({ roomId: 1, participants: 0, startTime: 'jutro', userId: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['participants', 'startTime', 'endTime', 'userId']));
    expect(res.body.error.details.every((d) => d.location === 'body')).toBe(true);
  });

  test('403 dla USER próbującego utworzyć salę', async () => {
    const jan = await registerAndLogin('jan@example.com');

    const res = await request(app).post('/api/rooms').set('Authorization', jan).send({ buildingId: 1, name: 'X1', capacity: 5 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('404 dla USER pobierającego cudzą rezerwację', async () => {
    const jan = await registerAndLogin('jan@example.com');
    const anna = await registerAndLogin('anna@example.com');
    const { body } = await request(app).post('/api/reservations').set('Authorization', jan).send(slot('10:00', '12:00')).expect(201);

    const res = await request(app).get(`/api/reservations/${body.id}`).set('Authorization', anna);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('409 ROOM_ALREADY_BOOKED dla nakładającej się rezerwacji', async () => {
    const jan = await registerAndLogin('jan@example.com');
    await request(app).post('/api/reservations').set('Authorization', jan).send(slot('10:00', '12:00')).expect(201);

    const res = await request(app).post('/api/reservations').set('Authorization', jan).send(slot('11:00', '13:00'));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ROOM_ALREADY_BOOKED');
  });

  test('pagination: meta.total i liczba elementów w data dla limit < liczby rekordów', async () => {
    const jan = await registerAndLogin('jan@example.com');
    for (const [start, end] of [['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00']]) {
      await request(app).post('/api/reservations').set('Authorization', jan).send(slot(start, end)).expect(201);
    }

    const res = await request(app).get('/api/reservations?limit=2&page=1').set('Authorization', jan);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('Audit log', () => {
  test('zapisuje tylko udane operacje; GET /api/admin/audit-log tylko dla ADMIN', async () => {
    const jan = await registerAndLogin('jan@example.com');
    const admin = await login('admin@example.com');

    const { body } = await request(app).post('/api/reservations').set('Authorization', jan).send(slot('10:00', '12:00')).expect(201);
    await request(app).post('/api/reservations').set('Authorization', jan).send(slot('11:00', '13:00')).expect(409);
    await request(app).patch(`/api/reservations/${body.id}/cancel`).set('Authorization', admin).expect(200);
    await request(app).patch(`/api/reservations/${body.id}/cancel`).set('Authorization', admin).expect(200);
    await waitForAuditLog(2);

    const res = await request(app).get('/api/admin/audit-log').set('Authorization', admin);

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2); // created + cancelled; kolizja i ponowne anulowanie bez eventu
    expect(res.body.data.map((e) => e.eventType)).toEqual(['reservation.cancelled', 'reservation.created']);
    expect(res.body.data[0].payload).toEqual({ reservationId: body.id, roomId: 1, userId: 2, cancelledBy: 1 });

    await request(app).get('/api/admin/audit-log').set('Authorization', jan).expect(403);
  });
});
