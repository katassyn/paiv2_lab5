const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors/AppError');

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*)$/;


function authenticate(jwtSecret) {
  return (req, res, next) => {
    const header = req.get('Authorization');
    if (!header) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const match = BEARER.exec(header);
    if (!match) {
      return next(new UnauthorizedError('Invalid Authorization header format, expected: Bearer <token>'));
    }

    try {
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'] });
      req.user = { id: Number(payload.sub), role: payload.role };
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expired', 'TOKEN_EXPIRED'));
      }
      next(new UnauthorizedError('Invalid token'));
    }
  };
}

module.exports = authenticate;
