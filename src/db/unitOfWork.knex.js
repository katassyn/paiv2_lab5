const { createUsersRepository } = require('../modules/auth/users.repository.knex');
const { createBuildingsRepository } = require('../modules/buildings/buildings.repository.knex');
const { createRoomsRepository } = require('../modules/rooms/rooms.repository.knex');
const { createReservationsRepository } = require('../modules/reservations/reservations.repository.knex');

// db to pula połączeń albo obiekt transakcji (trx), oba mają to samo API.
function createKnexRepositories(db) {
  return {
    users: createUsersRepository(db),
    buildings: createBuildingsRepository(db),
    rooms: createRoomsRepository(db),
    reservations: createReservationsRepository(db),
  };
}

// Unit of Work: service dostaje repositories powiązane z jedną transakcją.
// Normalny koniec funkcji -> COMMIT, wyjątek -> ROLLBACK.
//
// Ponawianie: przy równoczesnych INSERT-ach sprawdzanych exclusion constraintem PostgreSQL może
// wykryć deadlock (40P01) i przerwać jedną z transakcji. Taka transakcja nie zrobiła nic złego,
// więc standardowo ponawiamy ją od początku. W ponowionej próbie wcześniejsza rezerwacja jest już
// zatwierdzona, więc baza zwraca zwykłe naruszenie constraintu (23P01 -> 409 ROOM_ALREADY_BOOKED).
const RETRYABLE_CODES = new Set(['40P01', '40001']); // deadlock_detected, serialization_failure
const MAX_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createKnexUnitOfWork(db) {
  async function runInTransaction(fn) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await db.transaction((trx) => fn(createKnexRepositories(trx)));
      } catch (err) {
        if (!RETRYABLE_CODES.has(err.code) || attempt >= MAX_ATTEMPTS) throw err;
        await sleep(10 + Math.random() * 40 * attempt); // losowy odstęp, żeby transakcje się rozjechały
      }
    }
  }

  return { runInTransaction };
}

module.exports = { createKnexRepositories, createKnexUnitOfWork };
