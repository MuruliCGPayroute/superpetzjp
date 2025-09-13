const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'superpetz.in',
  user: 'r77vvyjsznh1',
  password: 'Payroute$29725',
  database: 'pets',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
