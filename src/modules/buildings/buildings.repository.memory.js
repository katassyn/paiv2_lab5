// Implementacja in-memory z tym samym interfejsem co wersja Knex (przyda się w zestawie 05).
const BUILDINGS_SEED = [
  { id: 1, name: 'Budynek A', address: 'ul. Warszawska 24, Kraków', createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 2, name: 'Budynek B', address: 'ul. Podchorążych 1, Kraków', createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 3, name: 'Budynek C', address: 'al. Jana Pawła II 37, Kraków', createdAt: new Date('2026-10-01T08:00:00Z') },
];

// deps.rooms jest uzupełniane przez unit of work (sale potrzebne do roomsCount)
function createBuildingsRepository(seed = BUILDINGS_SEED, deps = {}) {
  const buildings = structuredClone(seed);
  let nextId = Math.max(0, ...buildings.map((b) => b.id)) + 1;

  const withCount = (b) => ({
    ...b,
    roomsCount: deps.rooms ? deps.rooms._rows().filter((r) => r.buildingId === b.id).length : 0,
  });

  return {
    async findAll() {
      return buildings.map(withCount);
    },

    async findById(id) {
      const building = buildings.find((b) => b.id === id);
      return building ? withCount(building) : null;
    },

    async create({ name, address }) {
      if (buildings.some((b) => b.name === name)) {
        throw Object.assign(new Error('duplicate'), { code: '23505', constraint: 'buildings_name_unique' });
      }
      const building = { id: nextId++, name, address, createdAt: new Date() };
      buildings.push(building);
      return withCount(building);
    },

    _rows: () => buildings,
  };
}

module.exports = { createBuildingsRepository, BUILDINGS_SEED };
