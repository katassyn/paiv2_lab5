// Pomocniczy skrypt (N+1 z zadania 03): dodaje 15 rezerwacji przez API, żeby było ich 20.
// Uruchomienie: node scripts/add-reservations.js   (server musi działać, najpierw npm run seed)
const { BASE, login } = require('./lib');

(async () => {
  const token = await login();
  for (let i = 0; i < 15; i++) {
    const roomId = (i % 5) + 1;
    const day = String(1 + Math.floor(i / 5)).padStart(2, '0');
    const res = await fetch(`${BASE}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        roomId,
        participants: 5,
        startTime: `2026-12-${day}T${String(8 + (i % 3) * 3).padStart(2, '0')}:00:00Z`,
        endTime: `2026-12-${day}T${String(9 + (i % 3) * 3).padStart(2, '0')}:00:00Z`,
      }),
    });
    console.log(`rezerwacja ${i + 1}: sala ${roomId} -> ${res.status}`);
  }
})();
