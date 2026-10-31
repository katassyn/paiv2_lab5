// Jedna pula połączeń na całą aplikację.
const knex = require('knex');
const knexConfig = require('../../knexfile');

module.exports = knex(knexConfig);
