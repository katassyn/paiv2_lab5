const { Router } = require('express');
const validate = require('../../middleware/validate');
const authorize = require('../../middleware/authorize');
const { auditLogQuery } = require('./admin.schemas');

function createAdminRouter(controller) {
  const router = Router();

  router.use(authorize('ADMIN')); // cały moduł tylko dla ADMINa
  router.get('/audit-log', validate({ query: auditLogQuery }), controller.auditLog);

  return router;
}

module.exports = { createAdminRouter };
