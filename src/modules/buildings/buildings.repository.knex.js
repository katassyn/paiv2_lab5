// Repository jest jedynym miejscem, które zna nazwy tabel i kolumn (snake_case <-> camelCase).
function toBuilding(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    roomsCount: row.rooms_count ?? 0,
  };
}

function createBuildingsRepository(db) {
  // LEFT JOIN + GROUP BY: budynki bez sal też są zwracane (rooms_count = 0). Jedno zapytanie, brak N+1.
  const withRoomsCount = () =>
    db('buildings as b')
      .leftJoin('rooms as r', 'r.building_id', 'b.id')
      .groupBy('b.id')
      .select('b.id', 'b.name', 'b.address', 'b.created_at', db.raw('count(r.id)::int as rooms_count'));

  return {
    async findAll() {
      const rows = await withRoomsCount().orderBy('b.id', 'asc');
      return rows.map(toBuilding);
    },

    async findById(id) {
      return toBuilding(await withRoomsCount().where('b.id', id).first());
    },

    async create({ name, address }) {
      const [row] = await db('buildings').insert({ name, address }).returning('*');
      return toBuilding(row);
    },
  };
}

module.exports = { createBuildingsRepository };
