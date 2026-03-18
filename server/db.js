const crypto = require("crypto");
const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "store.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
let igdbToken = null;
let igdbTokenExpiry = 0;

const seedGames = [
  {
    title: "Neon Drift 2077",
    price: 19.99,
    platform: "PC",
    genre: "Carreras",
    image_url: "https://via.placeholder.com/320x200?text=Neon+Drift",
    description: "Velocidad urbana con estetica neon y modo historia corto.",
    stock: 25
  },
  {
    title: "Echoes of Mars",
    price: 24.99,
    platform: "PC",
    genre: "Aventura",
    image_url: "https://via.placeholder.com/320x200?text=Echoes+of+Mars",
    description: "Explora Marte con decisiones narrativas y mapas abiertos.",
    stock: 18
  },
  {
    title: "Vault Hunters",
    price: 29.99,
    platform: "PC",
    genre: "Accion",
    image_url: "https://via.placeholder.com/320x200?text=Vault+Hunters",
    description: "Cooperativo rapido con armas aleatorias y raids cortas.",
    stock: 12
  },
  {
    title: "Arcade Rift",
    price: 14.99,
    platform: "PC",
    genre: "Arcade",
    image_url: "https://via.placeholder.com/320x200?text=Arcade+Rift",
    description: "Minijuegos retro con tablas de puntaje semanales.",
    stock: 40
  },
  {
    title: "Crystal Tactics",
    price: 22.0,
    platform: "PC",
    genre: "Estrategia",
    image_url: "https://via.placeholder.com/320x200?text=Crystal+Tactics",
    description: "Combate por turnos y gestion de escuadrones.",
    stock: 16
  },
  {
    title: "Skyline Runner",
    price: 11.5,
    platform: "PC",
    genre: "Plataformas",
    image_url: "https://via.placeholder.com/320x200?text=Skyline+Runner",
    description: "Saltos precisos con niveles cortos para speedrun.",
    stock: 30
  },
  {
    title: "Shadow Circuit",
    price: 27.5,
    platform: "PC",
    genre: "RPG",
    image_url: "https://via.placeholder.com/320x200?text=Shadow+Circuit",
    description: "RPG tactico con misiones diarias y loot.",
    stock: 14
  },
  {
    title: "Solar Arena",
    price: 16.75,
    platform: "PC",
    genre: "Deportes",
    image_url: "https://via.placeholder.com/320x200?text=Solar+Arena",
    description: "Duelo futurista con reglas simples y partidas cortas.",
    stock: 28
  },
  {
    title: "Subzero Signal",
    price: 18.0,
    platform: "PC",
    genre: "Supervivencia",
    image_url: "https://via.placeholder.com/320x200?text=Subzero+Signal",
    description: "Explora hielo extremo con crafting basico.",
    stock: 20
  },
  {
    title: "Pulse Strike",
    price: 21.0,
    platform: "PC",
    genre: "Shooter",
    image_url: "https://via.placeholder.com/320x200?text=Pulse+Strike",
    description: "FPS rapido con arenas pequenas y ranking.",
    stock: 22
  },
  {
    title: "Mythic Forge",
    price: 25.0,
    platform: "PC",
    genre: "RPG",
    image_url: "https://via.placeholder.com/320x200?text=Mythic+Forge",
    description: "Crafteo de armas con misiones cortas.",
    stock: 10
  },
  {
    title: "Neptune Circuit",
    price: 13.0,
    platform: "PC",
    genre: "Puzzle",
    image_url: "https://via.placeholder.com/320x200?text=Neptune+Circuit",
    description: "Puzzle logico con niveles diarios.",
    stock: 35
  }
];

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function runGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function runAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function runExec(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}


async function getIgdbToken() {
  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    return null;
  }

  if (igdbToken && Date.now() < igdbTokenExpiry) {
    return igdbToken;
  }

  const params = new URLSearchParams({
    client_id: IGDB_CLIENT_ID,
    client_secret: IGDB_CLIENT_SECRET,
    grant_type: "client_credentials"
  });

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: params
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  igdbToken = data.access_token;
  igdbTokenExpiry = Date.now() + data.expires_in * 1000 - 60 * 1000;
  return igdbToken;
}

function normalizeCover(url) {
  if (!url) {
    return "";
  }
  return url.replace("t_thumb", "t_cover_big").replace(/^\/\//, "https://");
}

async function fetchIgdbGames(limit = 20) {
  const token = await getIgdbToken();
  if (!token) {
    return [];
  }

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": IGDB_CLIENT_ID,
      Authorization: `Bearer ${token}`
    },
    body: `fields name,cover.url,genres.name,summary,platforms.name,rating; where rating != null & cover != null; sort rating desc; limit ${limit};`
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

function toPrice(rating) {
  if (!Number.isFinite(rating)) {
    return 19.99;
  }
  const price = Math.max(9.99, Math.min(59.99, rating / 2));
  return Number(price.toFixed(2));
}

async function cleanupMissingImages() {
  await runExec("DELETE FROM games WHERE image_url IS NULL OR image_url = ''");
}

async function seedUsersIfNeeded() {
  await runExec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'").catch(() => {});
  await runExec("UPDATE users SET role = 'admin' WHERE is_admin = 1 AND (role IS NULL OR role = '')").catch(() => {});
  await runExec("UPDATE users SET role = 'user' WHERE is_admin = 0 AND (role IS NULL OR role = '')").catch(() => {});
  const row = await runGet("SELECT COUNT(*) as count FROM users");
  if (row && row.count === 0) {
    await runExec(
      "INSERT INTO users (name, email, password_hash, is_admin, role) VALUES (?, ?, ?, ?, ?)",
      ["Admin", "admin@demo.com", hashPassword("admin123"), 1, "admin"]
    );
  }
}

async function seedGamesFromIgdb({ replace = false, limit = 20 } = {}) {
  if (replace) {
    await runExec("DELETE FROM games");
  }

  await cleanupMissingImages();

  const row = await runGet("SELECT COUNT(*) as count FROM games");
  if (row && row.count > 0) {
    return;
  }

  const data = await fetchIgdbGames(limit);
  if (!data.length) {
    return;
  }

  const stmt = db.prepare(
    "INSERT INTO games (title, price, platform, genre, image_url, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  data.forEach((item) => {
    const genre = item.genres && item.genres.length ? item.genres[0].name : "";
    const platform =
      item.platforms && item.platforms.length ? item.platforms[0].name : "PC";
    stmt.run([
      item.name,
      toPrice(item.rating),
      platform,
      genre,
      normalizeCover(item.cover && item.cover.url),
      item.summary || "",
      20
    ]);
  });

  stmt.finalize();
}

function initDb() {
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, price REAL, platform TEXT, genre TEXT, image_url TEXT, description TEXT, stock INTEGER)"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password_hash TEXT, is_admin INTEGER DEFAULT 0, role TEXT DEFAULT 'user')"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS favorites (user_id INTEGER, game_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, game_id))"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, total REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)"
    );
    db.run(
      "CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, game_id INTEGER, title TEXT, price REAL, qty INTEGER)"
    );
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", () => {});
    db.run("UPDATE users SET role = 'admin' WHERE is_admin = 1 AND (role IS NULL OR role = '')");
    db.run("UPDATE users SET role = 'user' WHERE is_admin = 0 AND (role IS NULL OR role = '')");
  });
}

function seedDb() {
  seedUsersIfNeeded().catch(() => {});
  seedGamesFromIgdb({ replace: false, limit: 20 })
    .catch(() => {
      const stmt = db.prepare(
        "INSERT INTO games (title, price, platform, genre, image_url, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      seedGames.forEach((game) => {
        stmt.run([
          game.title,
          game.price,
          game.platform,
          game.genre,
          game.image_url,
          game.description,
          game.stock
        ]);
      });
      stmt.finalize();
    });
}

module.exports = {
  db,
  initDb,
  seedDb,
  seedGamesFromIgdb,
  cleanupMissingImages
};
