const bcrypt = require('bcryptjs');

// Hasła demo jak w seedzie Knex. Niski cost (4) tylko po to, żeby start w pamięci był szybki.
const USERS_SEED = [
  { id: 1, email: 'admin@example.com', passwordHash: bcrypt.hashSync('admin-password-123', 4), role: 'ADMIN', createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 2, email: 'jan.kowalski@example.com', passwordHash: bcrypt.hashSync('jan-password-123', 4), role: 'USER', createdAt: new Date('2026-10-01T08:00:00Z') },
  { id: 3, email: 'anna.nowak@example.com', passwordHash: bcrypt.hashSync('anna-password-123', 4), role: 'USER', createdAt: new Date('2026-10-01T08:00:00Z') },
];

function createUsersRepository(seed = USERS_SEED) {
  const users = structuredClone(seed);
  let nextId = Math.max(0, ...users.map((u) => u.id)) + 1;

  return {
    async findById(id) {
      return users.find((u) => u.id === id) ?? null;
    },

    async findByEmail(email) {
      return users.find((u) => u.email === email) ?? null;
    },

    async create({ email, passwordHash, role }) {
      if (users.some((u) => u.email === email)) {
        throw Object.assign(new Error('duplicate'), { code: '23505', constraint: 'users_email_unique' });
      }
      const user = { id: nextId++, email, passwordHash, role, createdAt: new Date() };
      users.push(user);
      return user;
    },

    _rows: () => users,
  };
}

module.exports = { createUsersRepository, USERS_SEED };
