// Zadanie 1: 10 równoległych rejestracji tego samego emaila. Oczekiwane: 1 x 201, 9 x 409 EMAIL_TAKEN, zero 500.
// Uruchomienie: node scripts/parallel-register.js
const { BASE } = require('./lib');

(async () => {
  const email = `race.${Date.now()}@example.com`;
  const results = await Promise.all(
    Array.from({ length: 10 }, async () => {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'bardzo-dlugie-haslo' }),
      });
      const body = await res.json();
      return `${res.status} ${body.error?.code ?? `id=${body.id}`}`;
    })
  );
  console.log(`email: ${email}`);
  results.forEach((r, i) => console.log(`request #${i + 1} -> ${r}`));
})();
