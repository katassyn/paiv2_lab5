// Wspólne przygotowanie testów integracyjnych: prawdziwa aplikacja (createApp, BEZ app.listen)
// na osobnej bazie testowej, z event busem i listenerem audit logu jak w server.js.
const request = require('supertest');
const bcrypt = require('bcryptjs');
const config = require('../../src/config');
const db = require('../../src/db/knex');
const { createApp } = require('../../src/app');
const { createKnexUnitOfWork } = require('../../src/db/unitOfWork.knex');
const { createEventBus } = require('../../src/events/eventBus');
const { registerAuditListeners } = require('../../src/events/auditListeners');

const eventBus = createEventBus();
registerAuditListeners(eventBus, db);

const app = createApp({ config, runInTransaction: createKnexUnitOfWork(db).runInTransaction, eventBus });

const PASSWORD = 'bardzo-dlugie-haslo';

// Schemat bazy testowej tworzą migracje (działa na świeżej, pustej bazie).
async function migrate() {
  await db.migrate.latest();
}

// Każdy test zaczyna od czystego, znanego stanu.
async function resetDatabase() {
  await db.raw('TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE');
  await db('buildings').insert([{ name: 'Budynek A', address: 'ul. Warszawska 24, Kraków' }]);
  await db('rooms').insert([
    { building_id: 1, name: 'A101', capacity: 30 }, // id 1
    { building_id: 1, name: 'A102', capacity: 15 }, // id 2
  ]);
  await db('users').insert({ email: 'admin@example.com', password_hash: await bcrypt.hash(PASSWORD, 4), role: 'ADMIN' });
}

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD }).expect(201);
  return login(email);
}

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  return `Bearer ${res.body.accessToken}`;
}

// Listenery działają asynchronicznie (po odpowiedzi), więc chwilę czekamy na zapis do audit_log.
async function waitForAuditLog(count) {
  for (let i = 0; i < 50; i++) {
    const [{ n }] = await db('audit_log').count({ n: 'id' });
    if (Number(n) >= count) return;
    await new Promise((r) => setTimeout(r, 20));
  }
}

module.exports = { app, db, migrate, resetDatabase, registerAndLogin, login, waitForAuditLog };
