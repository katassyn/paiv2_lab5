// Uruchamiany przed każdym plikiem testowym, ZANIM src/config wczyta konfigurację.
// Testy integracyjne czyszczą tabele, więc NIGDY nie mogą działać na bazie developerskiej:
// DATABASE_URL zawsze wskazuje bazę testową (TEST_DATABASE_URL z CI, z .env albo wartość domyślna).
const fs = require('node:fs');
const { parseEnv } = require('node:util');

// TEST_DATABASE_URL może być w .env. Jest daje testom własną kopię process.env, dlatego
// czytamy plik ręcznie (process.loadEnvFile() pisałby do innego obiektu).
if (fs.existsSync('.env') && process.env.TEST_DATABASE_URL === undefined) {
  const fromFile = parseEnv(fs.readFileSync('.env', 'utf8')).TEST_DATABASE_URL;
  if (fromFile) process.env.TEST_DATABASE_URL = fromFile;
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://roombooking:change-me@localhost:5433/roombooking_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.JWT_EXPIRES_IN = '15m';
