const { initDb, seedDb } = require("./db");

initDb();
seedDb();

console.log("Base de datos inicializada");
