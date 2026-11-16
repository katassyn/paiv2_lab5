// Composition root: JEDYNE miejsce, w którym wybieramy implementacje i podłączamy listenery eventów.
const config = require('./config');
const { createApp } = require('./app');
const { createEventBus } = require('./events/eventBus');

const eventBus = createEventBus();
let unitOfWork;
let db = null;

if (config.REPOSITORY === 'memory') {
  const { createInMemoryUnitOfWork } = require('./db/unitOfWork.memory');
  unitOfWork = createInMemoryUnitOfWork();
} else {
  db = require('./db/knex');
  const { createKnexUnitOfWork } = require('./db/unitOfWork.knex');
  const { registerAuditListeners } = require('./events/auditListeners');
  const { registerNotificationListeners } = require('./events/notificationListeners');
  unitOfWork = createKnexUnitOfWork(db);
  registerAuditListeners(eventBus, db);
  registerNotificationListeners(eventBus, db);
}

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction, eventBus });

const server = app.listen(config.PORT, () => {
  console.log(`Room Booking API running on http://localhost:${config.PORT} (repositories: ${config.REPOSITORY})`);
  console.log(`Swagger UI: http://localhost:${config.PORT}/api/docs`);
});

// Graceful shutdown: docker compose down wysyła SIGTERM. Przestajemy przyjmować nowe połączenia,
// czekamy na zakończenie trwających requestów i zamykamy pulę połączeń z bazą.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    if (db) await db.destroy();
    console.log('HTTP server closed, database pool closed, bye');
    process.exit(0);
  });
  server.closeIdleConnections(); // keep-alive bez aktywnego requestu nie blokuje zamknięcia

  // zabezpieczenie: gdyby jakiś request wisiał, kończymy przed SIGKILL od Dockera (10 s)
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
