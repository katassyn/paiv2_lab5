// Ostatnia linia obrony przed double bookingiem: baza nie pozwoli na dwie
// nakładające się rezerwacje CONFIRMED tej samej sali. '[)' = przedział półotwarty,
// więc rezerwacje stykające się (10:00-12:00 i 12:00-13:00) są dozwolone.
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS btree_gist');
  await knex.raw(`
    ALTER TABLE reservations ADD CONSTRAINT reservations_no_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status = 'CONFIRMED')
  `);
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap');
};
