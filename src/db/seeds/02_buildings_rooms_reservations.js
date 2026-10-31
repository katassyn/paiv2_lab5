const HOUR = 60 * 60 * 1000;

// Uruchamiany po 01_users.js (kolejność alfabetyczna). Tabele czyści już 01_users.js.
// Użytkownicy: 1 admin, 2 Jan Kowalski, 3 Anna Nowak.
exports.seed = async function (knex) {

  await knex('buildings').insert([
    { name: 'Budynek A', address: 'ul. Warszawska 24, Kraków' },
    { name: 'Budynek B', address: 'ul. Podchorążych 1, Kraków' },
    { name: 'Budynek C', address: 'al. Jana Pawła II 37, Kraków' }, // celowo bez sal (roomsCount: 0)
  ]);

  await knex('rooms').insert([
    { building_id: 1, name: 'A101', capacity: 30 },
    { building_id: 1, name: 'A102', capacity: 15 },
    { building_id: 1, name: '101', capacity: 50 },
    { building_id: 2, name: '101', capacity: 8 }, // ta sama nazwa co w budynku A: dozwolone
    { building_id: 2, name: 'B201', capacity: 40 },
  ]);

  // Rezerwacja, która już się rozpoczęła: liczona względem chwili uruchomienia seeda.
  const now = Date.now();
  const startedStart = new Date(Math.floor(now / HOUR) * HOUR - HOUR);
  const startedEnd = new Date(startedStart.getTime() + 3 * HOUR);

  await knex('reservations').insert([
    { room_id: 1, user_id: 2, participants: 20,
      start_time: '2026-11-10T10:00:00Z', end_time: '2026-11-10T12:00:00Z',
      status: 'CONFIRMED', internal_note: 'seed' },
    { room_id: 2, user_id: 3, participants: 10,
      start_time: startedStart, end_time: startedEnd,
      status: 'CONFIRMED', internal_note: 'seed: already started' },
    { room_id: 3, user_id: 2, participants: 25,
      start_time: '2026-11-10T10:00:00Z', end_time: '2026-11-10T12:00:00Z',
      status: 'CANCELLED', cancelled_at: '2026-10-20T09:00:00Z', internal_note: 'seed' },
    { room_id: 4, user_id: 3, participants: 6,
      start_time: '2026-11-12T08:00:00Z', end_time: '2026-11-12T09:30:00Z',
      status: 'CONFIRMED', internal_note: 'seed' },
    { room_id: 5, user_id: 2, participants: 35,
      start_time: '2026-11-20T13:00:00Z', end_time: '2026-11-20T15:00:00Z',
      status: 'CONFIRMED', internal_note: 'seed' },
  ]);
};
