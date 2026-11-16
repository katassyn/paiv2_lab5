module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // zmienne środowiskowe testów ustawiane ZANIM jakikolwiek moduł wczyta konfigurację
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
};
