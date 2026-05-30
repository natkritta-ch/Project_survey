const mysql = require('mysql2/promise');

async function resetDB() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'admin',
    password: '14112547',
    port: 3306
  });

  try {
    console.log("Dropping database project...");
    await connection.query('DROP DATABASE IF EXISTS `project`');
    console.log("Creating database project...");
    await connection.query('CREATE DATABASE `project`');
    console.log("Database reset successfully!");
  } catch (err) {
    console.error("Error resetting database:", err);
  } finally {
    await connection.end();
  }
}

resetDB();
