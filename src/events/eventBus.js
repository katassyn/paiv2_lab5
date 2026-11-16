const { EventEmitter } = require('node:events');

// Event bus oparty o EventEmitter z izolacją błędów listenerów.
// EventEmitter.emit jest synchroniczny i przekazuje wyjątki do miejsca wywołania, dlatego każdy
// handler uruchamiamy asynchronicznie i łapiemy jego błędy: awaria listenera nie psuje odpowiedzi API.
function createEventBus({ logger = console } = {}) {
  const emitter = new EventEmitter();

  return {
    publish(eventName, payload) {
      emitter.emit(eventName, { name: eventName, occurredAt: new Date().toISOString(), payload });
    },

    subscribe(eventName, handler) {
      emitter.on(eventName, (event) => {
        Promise.resolve()
          .then(() => handler(event))
          .catch((err) => logger.error(`[event:${eventName}] handler failed:`, err));
      });
    },
  };
}

// Pusta implementacja (null object): domyślna, gdy nikt nie przekaże event busa.
const noopEventBus = { publish() {}, subscribe() {} };

module.exports = { createEventBus, noopEventBus };
