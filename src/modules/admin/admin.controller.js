function toAuditLogResponse(entry) {
  return {
    id: entry.id,
    eventType: entry.eventType,
    payload: entry.payload,
    createdAt: new Date(entry.createdAt).toISOString(),
  };
}

function createAdminController(adminService) {
  return {
    async auditLog(req, res) {
      const { items, meta } = await adminService.listAuditLog(req.validated.query);
      res.json({ data: items.map(toAuditLogResponse), meta });
    },
  };
}

module.exports = { createAdminController };
