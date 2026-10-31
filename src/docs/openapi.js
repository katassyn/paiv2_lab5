// Dokumentacja REST API (OpenAPI 3.0). Udostępniana przez Swagger UI pod /api/docs.
// Format błędu zdefiniowany RAZ (components.schemas.Error) i używany przez $ref.

const err = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const R = {
  400: err('Błąd walidacji (VALIDATION_ERROR) albo niepoprawny JSON (INVALID_JSON)'),
  401: err('Brak tokenu, zły format nagłówka, zły podpis (UNAUTHORIZED) albo token wygasł (TOKEN_EXPIRED)'),
  403: err('Brak uprawnień (FORBIDDEN)'),
};
const json = (schema) => ({ 'application/json': { schema } });
const ok = (description, schema) => ({ description, content: json(schema) });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const idParam = (description) => ({
  name: 'id', in: 'path', required: true, description, schema: { type: 'integer', minimum: 1 },
});
const body = (schema) => ({ required: true, content: json(schema) });
const location = { Location: { description: 'Adres utworzonego zasobu', schema: { type: 'string' } } };

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Room Booking API',
    version: '4.0.0',
    description:
      'Rezerwacje sal w budynkach. Zaloguj się przez POST /api/auth/login, skopiuj accessToken i kliknij **Authorize**.\n\n' +
      'Konta demo (po `npm run seed`): `admin@example.com / admin-password-123` (ADMIN), ' +
      '`jan.kowalski@example.com / jan-password-123` (USER), `anna.nowak@example.com / anna-password-123` (USER).',
  },
  tags: [
    { name: 'Auth', description: 'Rejestracja, logowanie, bieżący użytkownik' },
    { name: 'Buildings', description: 'Budynki (zapis tylko ADMIN)' },
    { name: 'Rooms', description: 'Sale (zapis tylko ADMIN)' },
    { name: 'Reservations', description: 'Rezerwacje (USER widzi tylko swoje, ADMIN wszystkie)' },
  ],
  security: [{ bearerAuth: [] }], // domyślnie każdy endpoint wymaga tokenu
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    location: { type: 'string', enum: ['params', 'query', 'body'] },
                    field: { type: 'string', example: 'participants' },
                    message: { type: 'string', example: 'Too small: expected number to be >0' },
                  },
                },
              },
              requestId: { type: 'string', example: '0b6c3f1e-6a1d-4c3e-9d1a-2f4b5c6d7e8f' },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object', required: ['email', 'password'], additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', example: 'Jan.Nowy@example.com' },
          password: { type: 'string', minLength: 10, maxLength: 72, example: 'bardzo-dlugie-haslo' },
        },
      },
      LoginRequest: {
        type: 'object', required: ['email', 'password'], additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', example: 'jan.kowalski@example.com' },
          password: { type: 'string', example: 'jan-password-123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '15m' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          email: { type: 'string', example: 'jan.kowalski@example.com' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Building: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Budynek A' },
          address: { type: 'string', example: 'ul. Warszawska 24, Kraków' },
          roomsCount: { type: 'integer', example: 3 },
        },
      },
      CreateBuildingRequest: {
        type: 'object', required: ['name', 'address'], additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120, example: 'Budynek D' },
          address: { type: 'string', minLength: 3, maxLength: 255, example: 'ul. Długa 5, Kraków' },
        },
      },
      BuildingRef: {
        type: 'object',
        properties: { id: { type: 'integer', example: 1 }, name: { type: 'string', example: 'Budynek A' } },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 3 },
          name: { type: 'string', example: '101' },
          capacity: { type: 'integer', example: 50 },
          building: ref('BuildingRef'),
        },
      },
      CreateRoomRequest: {
        type: 'object', required: ['buildingId', 'name', 'capacity'], additionalProperties: false,
        properties: {
          buildingId: { type: 'integer', minimum: 1, example: 3 },
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'C1' },
          capacity: { type: 'integer', minimum: 1, example: 12 },
        },
      },
      Reservation: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 7 },
          room: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              name: { type: 'string', example: 'A101' },
              building: ref('BuildingRef'),
            },
          },
          user: {
            type: 'object',
            properties: { id: { type: 'integer', example: 2 }, email: { type: 'string', example: 'jan.kowalski@example.com' } },
          },
          participants: { type: 'integer', example: 20 },
          startTime: { type: 'string', format: 'date-time', example: '2026-11-10T10:00:00.000Z' },
          endTime: { type: 'string', format: 'date-time', example: '2026-11-10T12:00:00.000Z' },
          status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] },
          createdAt: { type: 'string', format: 'date-time' },
          cancelledAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CreateReservationRequest: {
        type: 'object', required: ['roomId', 'participants', 'startTime', 'endTime'], additionalProperties: false,
        description: 'Właściciel rezerwacji jest ustalany z tokenu. Pola userId / reservedBy w body dają 400.',
        properties: {
          roomId: { type: 'integer', minimum: 1, example: 1 },
          participants: { type: 'integer', minimum: 1, example: 10 },
          startTime: { type: 'string', format: 'date-time', example: '2026-11-10T12:00:00Z' },
          endTime: { type: 'string', format: 'date-time', example: '2026-11-10T13:00:00Z' },
        },
      },
      ReservationPage: {
        type: 'object',
        properties: {
          data: { type: 'array', items: ref('Reservation') },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              total: { type: 'integer', example: 37 },
              totalPages: { type: 'integer', example: 2 },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Rejestracja (zawsze rola USER)', security: [],
        requestBody: body(ref('RegisterRequest')),
        responses: {
          201: ok('Utworzony użytkownik (bez hasha hasła)', ref('User')),
          400: err('Zły email, hasło spoza 10-72 znaków albo nieznane pole, np. role (VALIDATION_ERROR)'),
          409: err('Email zajęty (EMAIL_TAKEN)'),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Logowanie, zwraca JWT', security: [],
        requestBody: body(ref('LoginRequest')),
        responses: {
          200: ok('Token dostępu', ref('LoginResponse')),
          400: R[400],
          401: err('Zły email albo złe hasło: identyczna odpowiedź (INVALID_CREDENTIALS)'),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Dane zalogowanego użytkownika',
        responses: { 200: ok('Zalogowany użytkownik', ref('User')), 401: R[401], 404: err('Użytkownik nie istnieje (NOT_FOUND)') },
      },
    },
    '/api/buildings': {
      get: {
        tags: ['Buildings'], summary: 'Lista budynków z liczbą sal',
        responses: { 200: ok('Budynki', { type: 'array', items: ref('Building') }), 401: R[401] },
      },
      post: {
        tags: ['Buildings'], summary: 'Nowy budynek (tylko ADMIN)',
        requestBody: body(ref('CreateBuildingRequest')),
        responses: {
          201: { ...ok('Utworzony budynek', ref('Building')), headers: location },
          400: R[400], 401: R[401], 403: R[403],
          409: err('Budynek o tej nazwie już istnieje (BUILDING_ALREADY_EXISTS)'),
        },
      },
    },
    '/api/buildings/{id}': {
      get: {
        tags: ['Buildings'], summary: 'Jeden budynek', parameters: [idParam('ID budynku')],
        responses: { 200: ok('Budynek', ref('Building')), 400: R[400], 401: R[401], 404: err('Budynek nie istnieje (NOT_FOUND)') },
      },
    },
    '/api/buildings/{id}/rooms': {
      get: {
        tags: ['Buildings'], summary: 'Sale budynku (budynek bez sal: [])', parameters: [idParam('ID budynku')],
        responses: {
          200: ok('Sale', { type: 'array', items: ref('Room') }),
          400: R[400], 401: R[401], 404: err('Budynek nie istnieje (NOT_FOUND)'),
        },
      },
    },
    '/api/rooms': {
      get: {
        tags: ['Rooms'], summary: 'Lista sal z budynkami',
        responses: { 200: ok('Sale', { type: 'array', items: ref('Room') }), 401: R[401] },
      },
      post: {
        tags: ['Rooms'], summary: 'Nowa sala (tylko ADMIN)',
        requestBody: body(ref('CreateRoomRequest')),
        responses: {
          201: { ...ok('Utworzona sala', ref('Room')), headers: location },
          400: R[400], 401: R[401], 403: R[403],
          404: err('Budynek nie istnieje (NOT_FOUND)'),
          409: err('Sala o tej nazwie już istnieje w budynku (ROOM_ALREADY_EXISTS)'),
        },
      },
    },
    '/api/rooms/{id}': {
      get: {
        tags: ['Rooms'], summary: 'Sala z budynkiem', parameters: [idParam('ID sali')],
        responses: { 200: ok('Sala', ref('Room')), 400: R[400], 401: R[401], 404: err('Sala nie istnieje (NOT_FOUND)') },
      },
    },
    '/api/reservations': {
      get: {
        tags: ['Reservations'],
        summary: 'Lista rezerwacji z paginacją (USER: tylko swoje, ADMIN: wszystkie)',
        parameters: [
          { name: 'userId', in: 'query', description: 'Tylko ADMIN; USER dostaje 403', schema: { type: 'integer', minimum: 1 } },
          { name: 'roomId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'buildingId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] } },
          { name: 'from', in: 'query', description: 'Rezerwacje nakładające się na [from, to)', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          {
            name: 'sort', in: 'query',
            schema: { type: 'string', default: 'startTime', enum: ['startTime', '-startTime', 'createdAt', '-createdAt', 'participants', '-participants'] },
          },
        ],
        responses: {
          200: ok('Strona wyników', ref('ReservationPage')),
          400: err('Zły parametr, nieznane sortowanie albo from >= to (VALIDATION_ERROR)'),
          401: R[401],
          403: err('USER użył filtra userId (FORBIDDEN)'),
        },
      },
      post: {
        tags: ['Reservations'], summary: 'Nowa rezerwacja (właściciel z tokenu)',
        requestBody: body(ref('CreateReservationRequest')),
        responses: {
          201: { ...ok('Utworzona rezerwacja', ref('Reservation')), headers: location },
          400: err('Błąd walidacji, nieznane pole (np. userId), endTime <= startTime, czas spoza 15 min - 8 h, start w przeszłości'),
          401: R[401],
          404: err('Sala nie istnieje (NOT_FOUND)'),
          409: err('Przekroczona pojemność sali (ROOM_CAPACITY_EXCEEDED) albo sala zajęta (ROOM_ALREADY_BOOKED)'),
        },
      },
    },
    '/api/reservations/{id}': {
      get: {
        tags: ['Reservations'], summary: 'Rezerwacja z salą, budynkiem i użytkownikiem', parameters: [idParam('ID rezerwacji')],
        responses: {
          200: ok('Rezerwacja', ref('Reservation')),
          400: R[400], 401: R[401],
          404: err('Rezerwacja nie istnieje albo należy do innego użytkownika (NOT_FOUND)'),
        },
      },
    },
    '/api/reservations/{id}/cancel': {
      patch: {
        tags: ['Reservations'], summary: 'Anulowanie rezerwacji (właściciel albo ADMIN, operacja idempotentna)',
        parameters: [idParam('ID rezerwacji')],
        responses: {
          200: ok('Anulowana rezerwacja', ref('Reservation')),
          400: R[400], 401: R[401],
          404: err('Rezerwacja nie istnieje albo należy do innego użytkownika (NOT_FOUND)'),
          409: err('Rezerwacja już się rozpoczęła (RESERVATION_ALREADY_STARTED)'),
        },
      },
    },
  },
};
