const { AppError } = require('../errors/AppError');

// Błędy PostgreSQL (SQLSTATE) mapowane na HTTP. Szczegóły z bazy (err.detail, nazwy tabel,
// wartości) nigdy nie trafiają do klienta.
const UNIQUE_MESSAGES = {
  rooms_building_id_name_unique: ['ROOM_ALREADY_EXISTS', 'Room with this name already exists in this building'],
  buildings_name_unique: ['BUILDING_ALREADY_EXISTS', 'Building with this name already exists'],
  users_email_unique: ['EMAIL_TAKEN', 'Email already registered'], // równoległe rejestracje tego samego emaila
};

function mapDatabaseError(err) {
  switch (err.code) {
    case '23505': { // unique_violation
      const [code, message] = UNIQUE_MESSAGES[err.constraint] ?? ['ALREADY_EXISTS', 'Resource already exists'];
      return { status: 409, code, message };
    }
    case '23P01': // exclusion_violation (reservations_no_overlap)
      return { status: 409, code: 'ROOM_ALREADY_BOOKED', message: 'Room is already booked in this time range' };
    case '40P01': // deadlock_detected (po wyczerpaniu ponowień w runInTransaction)
      // Deadlock przy sprawdzaniu exclusion constraintu oznacza, że inna transakcja w tej samej
      // chwili rezerwuje nakładający się termin w tej samej sali, czyli konflikt rezerwacji.
      if (err.where?.includes('exclusion constraint') || err.message?.includes('insert into "reservations"')) {
        return { status: 409, code: 'ROOM_ALREADY_BOOKED', message: 'Room is already booked in this time range' };
      }
      return { status: 409, code: 'CONCURRENT_MODIFICATION', message: 'Conflicting concurrent request, please retry' };
    case '40001': // serialization_failure
      return { status: 409, code: 'CONCURRENT_MODIFICATION', message: 'Conflicting concurrent request, please retry' };
    case '23503': // foreign_key_violation
      return { status: 409, code: 'FOREIGN_KEY_VIOLATION', message: 'Related resource does not exist or is still in use' };
    case '23514': // check_violation
      return { status: 400, code: 'CONSTRAINT_VIOLATION', message: 'Data violates a database constraint' };
    default:
      return null;
  }
}

// Jedyne miejsce, które zamienia błędy na odpowiedzi HTTP.
// Parametr next musi zostać w sygnaturze (Express rozpoznaje error handler po 4 argumentach).
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: req.id },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON', requestId: req.id },
    });
  }

  const dbError = mapDatabaseError(err);
  if (dbError) {
    console.warn(`[${req.id}] database constraint: ${err.code} ${err.constraint ?? ''}`);
    return res.status(dbError.status).json({
      error: { code: dbError.code, message: dbError.message, requestId: req.id },
    });
  }

  // Nieoczekiwany błąd: pełne szczegóły tylko w logach servera.
  console.error(`[${req.id}]`, err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', requestId: req.id },
  });
}

module.exports = errorHandler;
