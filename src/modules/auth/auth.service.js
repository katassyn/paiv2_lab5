const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ConflictError, NotFoundError, UnauthorizedError } = require('../../errors/AppError');

const BCRYPT_ROUNDS = 12;

// Hash porównywany, gdy użytkownik nie istnieje: zły email i złe hasło trwają tyle samo
// (inaczej po czasie odpowiedzi dałoby się sprawdzić, czy konto istnieje).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

function createAuthService({ runInTransaction, jwtSecret, jwtExpiresIn }) {
  async function register({ email, password }) {
    return runInTransaction(async ({ users }) => {
      const existing = await users.findByEmail(email);
      if (existing) throw new ConflictError('Email already registered', 'EMAIL_TAKEN');

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      // rola zawsze ustawiana przez backend; równoległy duplikat zatrzyma UNIQUE (23505 -> 409 EMAIL_TAKEN)
      return users.create({ email, passwordHash, role: 'USER' });
    });
  }

  async function login({ email, password }) {
    const user = await runInTransaction(({ users }) => users.findByEmail(email));
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk) throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');

    // w payloadzie bez emaila, hasha i danych osobowych
    const accessToken = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: jwtExpiresIn,
      algorithm: 'HS256',
    });

    return { accessToken, tokenType: 'Bearer', expiresIn: jwtExpiresIn };
  }

  async function getMe(currentUser) {
    return runInTransaction(async ({ users }) => {
      const user = await users.findById(currentUser.id);
      if (!user) throw new NotFoundError('User');
      return user;
    });
  }

  return { register, login, getMe };
}

module.exports = { createAuthService, BCRYPT_ROUNDS };
