// Implementacja in-memory z tym samym interfejsem co wersja Knex (przyda się w zestawie 05).
const RESERVATIONS_SEED = [
  {
    id: 1, roomId: 1, userId: 2, participants: 20,
    startTime: new Date('2026-11-10T10:00:00Z'), endTime: new Date('2026-11-10T12:00:00Z'),
    status: 'CONFIRMED', createdAt: new Date('2026-10-01T08:00:00Z'), cancelledAt: null, internalNote: 'seed',
  },
  {
    id: 2, roomId: 2, userId: 3, participants: 10,
    startTime: new Date('2026-10-01T08:00:00Z'), endTime: new Date('2026-10-01T10:00:00Z'),
    status: 'CONFIRMED', createdAt: new Date('2026-09-20T12:00:00Z'), cancelledAt: null, internalNote: 'seed',
  },
  {
    id: 3, roomId: 3, userId: 2, participants: 25,
    startTime: new Date('2026-11-10T10:00:00Z'), endTime: new Date('2026-11-10T12:00:00Z'),
    status: 'CANCELLED', createdAt: new Date('2026-10-02T09:00:00Z'),
    cancelledAt: new Date('2026-10-20T09:00:00Z'), internalNote: 'seed',
  },
  {
    id: 4, roomId: 4, userId: 3, participants: 6,
    startTime: new Date('2026-11-12T08:00:00Z'), endTime: new Date('2026-11-12T09:30:00Z'),
    status: 'CONFIRMED', createdAt: new Date('2026-10-03T09:00:00Z'), cancelledAt: null, internalNote: 'seed',
  },
  {
    id: 5, roomId: 5, userId: 2, participants: 35,
    startTime: new Date('2026-11-20T13:00:00Z'), endTime: new Date('2026-11-20T15:00:00Z'),
    status: 'CONFIRMED', createdAt: new Date('2026-10-04T09:00:00Z'), cancelledAt: null, internalNote: 'seed',
  },
];

const SORT_FIELDS = { startTime: 'startTime', createdAt: 'createdAt', participants: 'participants' };
const value = (v) => (v instanceof Date ? v.getTime() : v);

// deps.rooms, deps.buildings i deps.users są uzupełniane przez unit of work (sala, budynek, użytkownik w odpowiedzi)
function createReservationsRepository(seed = RESERVATIONS_SEED, deps = {}) {
  const reservations = structuredClone(seed);
  let nextId = Math.max(0, ...reservations.map((r) => r.id)) + 1;

  const withRoom = (r) => {
    const room = deps.rooms?._rows().find((x) => x.id === r.roomId);
    const building = room && deps.buildings?._rows().find((b) => b.id === room.buildingId);
    const user = deps.users?._rows().find((u) => u.id === r.userId);
    return {
      ...r,
      user: { id: r.userId, email: user?.email ?? null },
      room: {
        id: r.roomId,
        name: room?.name ?? null,
        building: { id: room?.buildingId ?? null, name: building?.name ?? null },
      },
    };
  };

  return {
    async findById(id) {
      const r = reservations.find((x) => x.id === id);
      return r ? withRoom(r) : null;
    },

    async findByRoomAndStatus(roomId, status) {
      return reservations.filter((r) => r.roomId === roomId && r.status === status).map(withRoom);
    },

    async list({ userId, roomId, buildingId, status, from, to, page = 1, limit = 20, sort = 'startTime' } = {}) {
      const all = reservations.map(withRoom).filter((r) =>
        (userId === undefined || r.userId === userId) &&
        (roomId === undefined || r.roomId === roomId) &&
        (buildingId === undefined || r.room.building.id === buildingId) &&
        (status === undefined || r.status === status) &&
        (to === undefined || r.startTime.getTime() < new Date(to).getTime()) &&
        (from === undefined || r.endTime.getTime() > new Date(from).getTime())
      );
      const desc = sort.startsWith('-');
      const field = SORT_FIELDS[desc ? sort.slice(1) : sort];
      all.sort((a, b) => (value(a[field]) - value(b[field])) * (desc ? -1 : 1) || a.id - b.id);
      return { items: all.slice((page - 1) * limit, page * limit), total: all.length };
    },

    async create(data) {
      const reservation = { id: nextId++, cancelledAt: null, ...data };
      reservations.push(reservation);
      return withRoom(reservation);
    },

    async update(id, changes) {
      const reservation = reservations.find((r) => r.id === id);
      if (!reservation) return null;
      Object.assign(reservation, changes);
      return withRoom(reservation);
    },
  };
}

module.exports = { createReservationsRepository, RESERVATIONS_SEED };
