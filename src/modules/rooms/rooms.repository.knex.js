function toRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    createdAt: row.created_at,
    buildingId: row.building_id,
    building: { id: row.building_id, name: row.building_name },
  };
}

function createRoomsRepository(db) {
  // Sala zawsze razem z budynkiem: jeden JOIN zamiast osobnego zapytania na każdą salę.
  const withBuilding = () =>
    db('rooms as r')
      .join('buildings as b', 'b.id', 'r.building_id')
      .select('r.id', 'r.name', 'r.capacity', 'r.created_at', 'r.building_id', 'b.name as building_name');

  async function findById(id) {
    return toRoom(await withBuilding().where('r.id', id).first());
  }

  return {
    async findAll() {
      const rows = await withBuilding().orderBy('r.id', 'asc');
      return rows.map(toRoom);
    },

    findById,

    async findByBuildingId(buildingId) {
      const rows = await withBuilding().where('r.building_id', buildingId).orderBy('r.id', 'asc');
      return rows.map(toRoom);
    },

    async create({ buildingId, name, capacity }) {
      const [{ id }] = await db('rooms').insert({ building_id: buildingId, name, capacity }).returning('id');
      return findById(id);
    },

    // SELECT ... FOR UPDATE: blokada wiersza sali do końca transakcji
    async lockById(id) {
      const row = await db('rooms').where({ id }).forUpdate().first('id');
      return Boolean(row);
    },
  };
}

module.exports = { createRoomsRepository };
