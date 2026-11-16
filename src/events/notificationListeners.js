// Symulacja powiadomienia: gdy ADMIN anuluje cudzą rezerwację, właściciel dostaje "wiadomość".
// Prawdziwa aplikacja wysłałaby tu maila; my tylko logujemy komunikat w konsoli.
function registerNotificationListeners(eventBus, db, { logger = console } = {}) {
  eventBus.subscribe('reservation.cancelled', async ({ payload }) => {
    if (payload.cancelledBy === payload.userId) return; // właściciel anulował sam

    const owner = await db('users').where({ id: payload.userId }).first('email');
    logger.log(
      `[notification] to: ${owner.email} | Twoja rezerwacja #${payload.reservationId} ` +
        `(sala ${payload.roomId}) została anulowana przez administratora`
    );
  });
}

module.exports = { registerNotificationListeners };
