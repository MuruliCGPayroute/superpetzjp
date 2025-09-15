const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'p3plzcpnl509495.prod.phx3.secureserver.net',
  user: 'r77vvyjsznh1',
  password: 'Payroute$29725',
  database: 'pets',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
