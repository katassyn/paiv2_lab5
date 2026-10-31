# Room Booking API (Zadanie 04)

REST API do rezerwacji sal: Node.js, Express 5, Zod, PostgreSQL 16 (Docker), Knex, bcryptjs, JWT, Swagger UI.

## Uruchomienie od zera

```bash
npm install
copy .env.example .env      # Windows (Linux/macOS: cp); uzupełnij DATABASE_URL i wygeneruj JWT_SECRET
npm run db:up               # PostgreSQL w Dockerze, port 5433
npm run migrate
npm run seed
npm start                   # http://localhost:3000, Swagger: http://localhost:3000/api/docs
```

Losowy sekret: `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`

## Konta demo (po `npm run seed`)

| Email | Hasło | Rola |
| --- | --- | --- |
| admin@example.com | admin-password-123 | ADMIN |
| jan.kowalski@example.com | jan-password-123 | USER |
| anna.nowak@example.com | anna-password-123 | USER |

To hasła demo do lokalnego developmentu. Konto ADMIN powstaje tylko w seedzie, rejestracja zawsze daje USER.

## Konfiguracja

Wszystkie zmienne czyta i waliduje `src/config/index.js` (Zod). Błędna albo brakująca zmienna zatrzymuje start aplikacji.

| Zmienna | Opis | Domyślnie |
| --- | --- | --- |
| DATABASE_URL | `postgres://...` | wymagana |
| JWT_SECRET | min. 32 znaki | wymagana |
| JWT_EXPIRES_IN | czas życia tokenu, np. `15m`, `10s` | 15m |
| PORT | port HTTP | 3000 |
| REPOSITORY | `knex` albo `memory` | knex |

## Role

| Rola | Może |
| --- | --- |
| USER | przeglądać budynki i sale, tworzyć rezerwacje, przeglądać i anulować własne |
| ADMIN | to co USER oraz tworzyć budynki i sale, przeglądać i anulować wszystkie rezerwacje |

## Przydatne skrypty

| Komenda | Co robi |
| --- | --- |
| `npm run db:psql` | psql w kontenerze |
| `node scripts/tamper-token.js <token>` | token ze złym podpisem i ze zmienionym payloadem (testy 401) |
| `npm run parallel-register` | 10 równoległych rejestracji tego samego emaila |
| `npm run double-booking` | 10 równoległych identycznych rezerwacji |
