// Konta demo. ADMIN da się utworzyć tylko tutaj (rejestracja zawsze nadaje rolę USER).
// To są hasła DEMO do lokalnego developmentu, a nie prawdziwe sekrety.
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

exports.seed = async function (knex) {
  // czyszczenie tylko raz, na początku: CASCADE czyści też tabele zależne
  await knex.raw('TRUNCATE audit_log, reservations, rooms, buildings, users RESTART IDENTITY CASCADE');

  const accounts = [
    { email: 'admin@example.com', password: 'admin-password-123', role: 'ADMIN' }, // id 1
    { email: 'jan.kowalski@example.com', password: 'jan-password-123', role: 'USER' }, // id 2
    { email: 'anna.nowak@example.com', password: 'anna-password-123', role: 'USER' }, // id 3
  ];

  for (const { email, password, role } of accounts) {
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await knex('users').insert({ email, password_hash, role });
  }
};
