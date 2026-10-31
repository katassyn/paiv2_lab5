// Whitelist sortowania: wartość z API -> kolumna w SQL (nazwy kolumn nie mogą być parametrem zapytania).
const SORT_COLUMNS = {
  startTime: 'r.start_time',
  createdAt: 'r.created_at',
  participants: 'r.participants',
};

const COLUMNS = [
  'r.id', 'r.room_id', 'r.user_id', 'u.email as user_email', 'r.participants', 'r.start_time', 'r.end_time',
  'r.status', 'r.created_at', 'r.cancelled_at', 'r.internal_note',
  'ro.name as room_name', 'ro.building_id', 'b.name as building_name',
];

function toReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    room: { id: row.room_id, name: row.room_name, building: { id: row.building_id, name: row.building_name } },
    userId: row.user_id,
    user: { id: row.user_id, email: row.user_email },
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    internalNote: row.internal_note,
  };
}

function createReservationsRepository(db) {
  // Rezerwacja + sala + budynek + użytkownik w JEDNYM zapytaniu (brak N+1).
  const joined = () =>
    db('reservations as r')
      .join('rooms as ro', 'ro.id', 'r.room_id')
      .join('buildings as b', 'b.id', 'ro.building_id')
      .join('users as u', 'u.id', 'r.user_id');

  async function findById(id) {
    return toReservation(await joined().select(COLUMNS).where('r.id', id).first());
  }

  return {
    findById,

    async findByRoomAndStatus(roomId, status) {
      const rows = await joined().select(COLUMNS).where({ 'r.room_id': roomId, 'r.status': status });
      return rows.map(toReservation);
    },

    // Filtrowanie, sortowanie i pagination robi baza (WHERE, ORDER BY, LIMIT, OFFSET).
    async list({ userId, roomId, buildingId, status, from, to, page = 1, limit = 20, sort = 'startTime' } = {}) {
      const filtered = joined().modify((qb) => {
        if (userId !== undefined) qb.where('r.user_id', userId);
        if (roomId !== undefined) qb.where('r.room_id', roomId);
        if (buildingId !== undefined) qb.where('ro.building_id', buildingId);
        if (status !== undefined) qb.where('r.status', status);
        // nakładanie się na [from, to): start < to AND end > from
        if (to !== undefined) qb.where('r.start_time', '<', to);
        if (from !== undefined) qb.where('r.end_time', '>', from);
      });

      const desc = sort.startsWith('-');
      const column = SORT_COLUMNS[desc ? sort.slice(1) : sort];

      const [rows, { count }] = await Promise.all([
        filtered.clone()
          .select(COLUMNS)
          .orderBy(column, desc ? 'desc' : 'asc')
          .orderBy('r.id', 'asc') // tie-breaker: stabilna kolejność
          .limit(limit)
          .offset((page - 1) * limit),
        filtered.clone().count({ count: 'r.id' }).first(),
      ]);

      return { items: rows.map(toReservation), total: Number(count) };
    },

    async create({ roomId, userId, participants, startTime, endTime, status, createdAt, internalNote }) {
      const [{ id }] = await db('reservations')
        .insert({
          room_id: roomId,
          user_id: userId,
          participants,
          start_time: startTime,
          end_time: endTime,
          status,
          created_at: createdAt,
          internal_note: internalNote,
        })
        .returning('id');
      return findById(id);
    },

    async update(id, changes) {
      const columns = {};
      if (changes.status !== undefined) columns.status = changes.status;
      if (changes.cancelledAt !== undefined) columns.cancelled_at = changes.cancelledAt;

      const updated = await db('reservations').where({ id }).update(columns);
      return updated ? findById(id) : null;
    },
  };
}

module.exports = { createReservationsRepository };
