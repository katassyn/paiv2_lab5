const { createUsersRepository } = require('../modules/auth/users.repository.memory');
const { createBuildingsRepository } = require('../modules/buildings/buildings.repository.memory');
const { createRoomsRepository } = require('../modules/rooms/rooms.repository.memory');
const { createReservationsRepository } = require('../modules/reservations/reservations.repository.memory');

// Wersja in-memory: ten sam interfejs, w pamięci nie ma czego cofać, więc funkcja jest po prostu wywoływana.
function createInMemoryUnitOfWork(seed = {}) {
  const deps = {};
  deps.users = createUsersRepository(seed.users);
  deps.buildings = createBuildingsRepository(seed.buildings, deps);
  deps.rooms = createRoomsRepository(seed.rooms, deps);
  deps.reservations = createReservationsRepository(seed.reservations, deps);

  const repositories = {
    users: deps.users,
    buildings: deps.buildings,
    rooms: deps.rooms,
    reservations: deps.reservations,
  };
  return { repositories, runInTransaction: (fn) => fn(repositories) };
}

module.exports = { createInMemoryUnitOfWork };
