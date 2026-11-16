// Wersja in-memory z tym samym interfejsem (do testów jednostkowych).
function createAuditLogRepository(seed = []) {
  const entries = structuredClone(seed);

  return {
    async list({ eventType, page = 1, limit = 20 } = {}) {
      const filtered = entries
        .filter((e) => eventType === undefined || e.eventType === eventType)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id);
      return { items: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
    },
    _rows: () => entries,
  };
}

module.exports = { createAuditLogRepository };
