function toEntry(row) {
  return { id: Number(row.id), eventType: row.event_type, payload: row.payload, createdAt: row.created_at };
}

function createAuditLogRepository(db) {
  return {
    // Najnowsze pierwsze; filtrowanie i pagination robi baza.
    async list({ eventType, page = 1, limit = 20 } = {}) {
      const filtered = db('audit_log').modify((qb) => {
        if (eventType !== undefined) qb.where('event_type', eventType);
      });
      const [rows, { count }] = await Promise.all([
        filtered.clone().select('*').orderBy([{ column: 'created_at', order: 'desc' }, { column: 'id', order: 'desc' }])
          .limit(limit).offset((page - 1) * limit),
        filtered.clone().count({ count: 'id' }).first(),
      ]);
      return { items: rows.map(toEntry), total: Number(count) };
    },
  };
}

module.exports = { createAuditLogRepository };
