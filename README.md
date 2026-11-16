# Room Booking API

[![CI](https://github.com/katassyn/paiv2_lab5/actions/workflows/ci.yml/badge.svg)](https://github.com/katassyn/paiv2_lab5/actions/workflows/ci.yml)

REST API do rezerwacji sal w budynkach (laboratoria ZTPAI, zestawy 01 do 05).
Node.js 22, Express 5, Zod, PostgreSQL 16, Knex, JWT, Swagger UI, Jest, Supertest, Docker Compose, GitHub Actions.

## Uruchomienie od zera (Docker)

Wymagany tylko Docker (Docker Desktop).

```bash
git clone https://github.com/katassyn/paiv2_lab5.git
cd paiv2_lab5
cp .env.example .env          # Windows PowerShell: copy .env.example .env
docker compose up --build
```

Gotowe:

- API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api/docs

Kontener `api` przy starcie sam wykonuje migracje bazy. Konta demo (ADMIN i dwóch użytkowników) dodaje seed, uruchamiany w działającym kontenerze:

```bash
docker compose exec api npx knex seed:run
```

| Email | Hasło | Rola |
| --- | --- | --- |
| admin@example.com | admin-password-123 | ADMIN |
| jan.kowalski@example.com | jan-password-123 | USER |
| anna.nowak@example.com | anna-password-123 | USER |

Zatrzymanie: `docker compose down` (dane zostają w volume), `docker compose down -v` (razem z danymi).
Aplikacja obsługuje `SIGTERM` (graceful shutdown), więc zatrzymanie trwa chwilę, a nie 10 sekund.

Baza z Compose jest wystawiona na porcie **5433**. Jeżeli port jest zajęty (np. przez kontener z wcześniejszych zestawów), zatrzymaj tamten kontener.

## Testy

```bash
npm install
docker compose up -d db       # baza (tworzy też pustą bazę roombooking_test)
npm test                      # unit + integration
npm run test:unit             # same unit testy (nie potrzebują bazy)
npm run test:integration      # testy API na bazie testowej
```

- **Unit** (`tests/unit`): service rezerwacji z repositories in-memory i wstrzykniętym czasem. Bez bazy danych.
- **Integration** (`tests/integration`): Supertest na `createApp()` (bez uruchamiania servera na porcie), osobna baza `roombooking_test`. Schemat tworzą migracje w `beforeAll`, stan jest czyszczony przed każdym testem.

Testy integracyjne zawsze używają bazy z `TEST_DATABASE_URL`, nigdy developerskiej (`tests/setupEnv.js`).

## Eventy i audit log

Service rezerwacji publikuje eventy po zatwierdzeniu transakcji: `reservation.created` i `reservation.cancelled`.
Nieudana operacja (np. 409) i ponowne anulowanie nie publikują eventu.

- event bus: `src/events/eventBus.js` (EventEmitter z izolacją błędów listenerów),
- listener audit logu: zapis do tabeli `audit_log` (payload jako `jsonb`),
- listener powiadomień: gdy ADMIN anuluje cudzą rezerwację, w logach pojawia się `[notification] to: <email właściciela> ...`,
- `GET /api/admin/audit-log?eventType=&page=&limit=` (tylko ADMIN), najnowsze wpisy pierwsze.

## Uruchomienie bez Dockera dla API

```bash
npm install
docker compose up -d db
npm run migrate
npm run seed
npm run dev
```

## Konfiguracja

Wszystkie zmienne są w `.env` (wzór: `.env.example`, plik `.env` jest w `.gitignore`). Zmienne waliduje `src/config/index.js`: błędna konfiguracja zatrzymuje start aplikacji.

## CI

`.github/workflows/ci.yml` przy każdym push do `main` i pull requeście:

1. uruchamia `npm test` z PostgreSQL jako service,
2. sprawdza, że obraz Docker się buduje,
3. uruchamia całość od zera przez `docker compose up --build` i sprawdza API, seed i graceful shutdown.
