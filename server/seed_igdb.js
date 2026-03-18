const { initDb, seedGamesFromIgdb, seedDb } = require("./db");

async function run() {
  initDb();
  await seedGamesFromIgdb({ replace: true, limit: 20 });
  await seedDb();
  console.log("Seed IGDB completado");
}

run().catch((err) => {
  console.error("Error al hacer seed IGDB", err);
  process.exit(1);
});
