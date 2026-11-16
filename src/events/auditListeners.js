// Listener zapisujący każdy event rezerwacji do tabeli audit_log.
const AUDITED_EVENTS = ['reservation.created', 'reservation.cancelled'];

function registerAuditListeners(eventBus, db) {
  const save = async (event) => {
    await db('audit_log').insert({
      event_type: event.name,
      payload: event.payload,
      created_at: event.occurredAt,
    });
  };

  for (const eventName of AUDITED_EVENTS) eventBus.subscribe(eventName, save);
}

module.exports = { registerAuditListeners, AUDITED_EVENTS };
