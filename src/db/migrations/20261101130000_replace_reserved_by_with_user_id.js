// reservations.reserved_by (tekst) -> reservations.user_id (FK do users).
// Migracja działa na bazie Z DANYMI: dla każdej osoby z reserved_by tworzy konto
// (email z imienia i nazwiska, bez możliwości logowania) i przypisuje do niego rezerwacje.

// Konto utworzone przez migrację nie ma hasła: ten ciąg nie jest poprawnym hashem bcrypt,
// więc bcrypt.compare zawsze zwróci false. Hasło można później ustawić (np. reset hasła).
const MIGRATED_PASSWORD_HASH = '!migrated-account-without-password';

function emailFromName(name) {
  const local = name
    .trim()
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // usuwa polskie znaki diakrytyczne
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${local || 'user'}@example.com`;
}

exports.up = async function (knex) {
  // 1. Nowa kolumna, na razie NULL (istniejące wiersze nie mają jeszcze wartości)
  await knex.schema.alterTable('reservations', (table) => {
    // RESTRICT: nie usuwamy po cichu historii rezerwacji razem z kontem
    table.integer('user_id').references('id').inTable('users').onDelete('RESTRICT');
    table.index(['user_id'], 'reservations_user_id_idx');
  });

  // 2. Backfill: konto dla każdej osoby z reserved_by, potem przypisanie rezerwacji
  const names = await knex('reservations').distinct('reserved_by').pluck('reserved_by');
  for (const name of names) {
    const email = emailFromName(name);
    await knex('users')
      .insert({ email, password_hash: MIGRATED_PASSWORD_HASH, role: 'USER' })
      .onConflict('email')
      .ignore();
    const user = await knex('users').where({ email }).first('id');
    await knex('reservations').where({ reserved_by: name }).update({ user_id: user.id });
  }

  // 3. Każda rezerwacja ma właściciela: NOT NULL, stara kolumna znika
  await knex.schema.alterTable('reservations', (table) => {
    table.integer('user_id').notNullable().alter();
    table.dropColumn('reserved_by');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('reservations', (table) => {
    table.string('reserved_by', 100);
  });
  // email właściciela jako tekst (imienia i nazwiska nie da się odtworzyć)
  await knex.raw(
    'UPDATE reservations r SET reserved_by = u.email FROM users u WHERE u.id = r.user_id'
  );
  await knex.schema.alterTable('reservations', (table) => {
    table.string('reserved_by', 100).notNullable().alter();
    table.dropIndex(['user_id'], 'reservations_user_id_idx');
    table.dropColumn('user_id');
  });
  await knex('users').where({ password_hash: MIGRATED_PASSWORD_HASH }).del();
};
