const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');

// Role-based authorization: authorize('ADMIN')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!allowedRoles.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

module.exports = authorize;
