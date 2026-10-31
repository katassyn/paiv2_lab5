const ROOMS_SEED = [
  { id: 1, buildingId: 1, name: 'A101', capacity: 30, createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 2, buildingId: 1, name: 'A102', capacity: 15, createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 3, buildingId: 1, name: '101', capacity: 50, createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 4, buildingId: 2, name: '101', capacity: 8, createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 5, buildingId: 2, name: 'B201', capacity: 40, createdAt: new Date('2026-10-01T08:00:00Z') },
];

// deps.buildings jest uzupełniane przez unit of work (nazwa budynku w odpowiedzi)
function createRoomsRepository(seed = ROOMS_SEED, deps = {}) {
  const rooms = structuredClone(seed);
  let nextId = Math.max(0, ...rooms.map((r) => r.id)) + 1;

  const withBuilding = (room) => {
    const building = deps.buildings?._rows().find((b) => b.id === room.buildingId);
    return { ...room, building: { id: room.buildingId, name: building?.name ?? null } };
  };

  return {
    async findAll() {
      return rooms.map(withBuilding);
    },

    async findById(id) {
      const room = rooms.find((r) => r.id === id);
      return room ? withBuilding(room) : null;
    },

    async findByBuildingId(buildingId) {
      return rooms.filter((r) => r.buildingId === buildingId).map(withBuilding);
    },

    async create({ buildingId, name, capacity }) {
      if (rooms.some((r) => r.buildingId === buildingId && r.name === name)) {
        throw Object.assign(new Error('duplicate'), { code: '23505', constraint: 'rooms_building_id_name_unique' });
      }
      const room = { id: nextId++, buildingId, name, capacity, createdAt: new Date() };
      rooms.push(room);
      return withBuilding(room);
    },

    async lockById(id) {
      return rooms.some((r) => r.id === id); // w pamięci nie ma czego blokować
    },

    _rows: () => rooms,
  };
}

module.exports = { createRoomsRepository, ROOMS_SEED };
