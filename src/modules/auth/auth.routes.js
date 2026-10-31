const { Router } = require('express');
const validate = require('../../middleware/validate');
const { registerBody, loginBody } = require('./auth.schemas');

function createAuthRouter(controller, requireAuth) {
  const router = Router();

  router.post('/register', validate({ body: registerBody }), controller.register); // publiczny
  router.post('/login', validate({ body: loginBody }), controller.login); // publiczny
  router.get('/me', requireAuth, controller.me);

  return router;
}

module.exports = { createAuthRouter };
