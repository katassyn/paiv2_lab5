// Wspólne funkcje skryptów: adres API z modułu konfiguracji i logowanie kontem demo.
const config = require('../src/config');

const BASE = `http://localhost:${config.PORT}`;

async function login(email = 'jan.kowalski@example.com', password = 'jan-password-123') {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} (uruchom server i npm run seed)`);
  return (await res.json()).accessToken;
}

module.exports = { BASE, login };
