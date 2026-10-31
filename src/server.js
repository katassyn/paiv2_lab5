// Composition root: JEDYNE miejsce, w którym wybieramy implementację repositories.
const config = require('./config');
const { createApp } = require('./app');

let unitOfWork;
if (config.REPOSITORY === 'memory') {
  const { createInMemoryUnitOfWork } = require('./db/unitOfWork.memory');
  unitOfWork = createInMemoryUnitOfWork();
} else {
  const db = require('./db/knex');
  const { createKnexUnitOfWork } = require('./db/unitOfWork.knex');
  unitOfWork = createKnexUnitOfWork(db);
}

const app = createApp({ config, runInTransaction: unitOfWork.runInTransaction });

app.listen(config.PORT, () => {
  console.log(`Room Booking API running on http://localhost:${config.PORT} (repositories: ${config.REPOSITORY})`);
  console.log(`Swagger UI: http://localhost:${config.PORT}/api/docs`);
});
