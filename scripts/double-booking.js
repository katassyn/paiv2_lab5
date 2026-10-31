// Zadanie 03/5: 10 równoległych, identycznych requestów POST /api/reservations
// (ta sama sala, ten sam przedział czasu), potem sprawdzenie stanu bazy zapytaniem SQL.
// Uruchomienie: node scripts/double-booking.js   (server musi działać)
const db = require('../src/db/knex');
const { BASE, login } = require('./lib');

const ROOM_ID = 1;
const START = '2026-12-01T10:00:00.000Z';
const END = '2026-12-01T12:00:00.000Z';
const REQUESTS = 10;

async function book(i, token) {
  const res = await fetch(`${BASE}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roomId: ROOM_ID, participants: 5, startTime: START, endTime: END }),
  });
  const body = await res.json();
  return { i, status: res.status, code: body.error?.code ?? `id=${body.id}` };
}

(async () => {
  // sprzątanie po poprzednim uruchomieniu, żeby każdy przebieg startował z tego samego stanu
  await db('reservations').where({ room_id: ROOM_ID, start_time: START, end_time: END }).del();

  const token = await login();
  const results = await Promise.all(Array.from({ length: REQUESTS }, (_, i) => book(i + 1, token)));

  console.log(`\n${REQUESTS} równoległych requestów: sala ${ROOM_ID}, ${START} - ${END}\n`);
  for (const r of results) console.log(`request #${String(r.i).padStart(2)} -> ${r.status} ${r.code}`);

  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log('\npodsumowanie:', Object.entries(counts).map(([s, n]) => `${n} x ${s}`).join(', '));

  const { rows } = await db.raw(
    `SELECT count(*)::int AS confirmed
       FROM reservations
      WHERE room_id = ? AND status = 'CONFIRMED'
        AND tstzrange(start_time, end_time, '[)') && tstzrange(?::timestamptz, ?::timestamptz, '[)')`,
    [ROOM_ID, START, END]
  );
  console.log(`rezerwacje CONFIRMED w bazie dla tej sali i przedziału: ${rows[0].confirmed}\n`);

  await db.destroy();
})().catch(async (err) => {
  console.error(err);
  await db.destroy();
  process.exit(1);
});
