-- Próby złamania constraintów ręcznym INSERT-em (zadanie 1).
-- Uruchom po: npm run migrate && npm run seed
-- W psql: npm run db:psql, potem wklejaj po jednym zapytaniu. Każde powinno skończyć się błędem.

-- 1. buildings.name UNIQUE (Budynek A już istnieje)
INSERT INTO buildings (name, address) VALUES ('Budynek A', 'ul. Testowa 1');

-- 2. rooms (building_id, name) UNIQUE (sala A101 w budynku 1 już istnieje)
INSERT INTO rooms (building_id, name, capacity) VALUES (1, 'A101', 10);

-- 2b. Ta sama nazwa w INNYM budynku jest dozwolona (to zapytanie PRZEJDZIE; potem usuń wiersz)
-- INSERT INTO rooms (building_id, name, capacity) VALUES (2, 'A101', 10);

-- 3. rooms.capacity CHECK (capacity > 0)
INSERT INTO rooms (building_id, name, capacity) VALUES (1, 'Z999', 0);

-- 4. FK rooms.building_id -> nieistniejący budynek
INSERT INTO rooms (building_id, name, capacity) VALUES (999, 'X1', 10);

-- 5. reservations CHECK (end_time > start_time)
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time)
VALUES (1, 2, 5, '2026-12-10T12:00:00Z', '2026-12-10T10:00:00Z');

-- 6. reservations.status CHECK (tylko CONFIRMED / CANCELLED)
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time, status)
VALUES (1, 2, 5, '2026-12-10T10:00:00Z', '2026-12-10T12:00:00Z', 'PENDING');

-- 7. reservations.participants CHECK (participants > 0)
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time)
VALUES (1, 2, 0, '2026-12-10T10:00:00Z', '2026-12-10T12:00:00Z');

-- 8. FK reservations.room_id -> nieistniejąca sala
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time)
VALUES (999, 2, 5, '2026-12-10T10:00:00Z', '2026-12-10T12:00:00Z');

-- 9. ON DELETE RESTRICT: nie można usunąć sali, która ma rezerwacje
DELETE FROM rooms WHERE id = 1;

-- 10. ON DELETE RESTRICT: nie można usunąć budynku, który ma sale
DELETE FROM buildings WHERE id = 1;

-- 11. Exclusion constraint (zadanie 5): nakładająca się rezerwacja CONFIRMED w sali 1 (seed: 10:00-12:00)
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time)
VALUES (1, 2, 5, '2026-11-10T11:00:00Z', '2026-11-10T13:00:00Z');

-- 12. users.email UNIQUE (zadanie 04)
INSERT INTO users (email, password_hash) VALUES ('admin@example.com', 'x');

-- 13. users.role CHECK (zadanie 04)
INSERT INTO users (email, password_hash, role) VALUES ('nowy@example.com', 'x', 'SUPERADMIN');

-- 14. reservations.user_id FK -> nieistniejący użytkownik (zadanie 04)
INSERT INTO reservations (room_id, user_id, participants, start_time, end_time)
VALUES (1, 999, 5, '2026-12-10T10:00:00Z', '2026-12-10T12:00:00Z');
