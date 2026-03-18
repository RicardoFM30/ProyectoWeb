const crypto = require("crypto");
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const { db, initDb, seedDb } = require("./db");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3000;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
let igdbToken = null;
let igdbTokenExpiry = 0;

initDb();
seedDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
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

function sanitizeQuery(value) {
  return value.replace(/"/g, "\\\"");
}

function getRoleFromHeaders(req) {
  if (req.headers["x-admin"] === "true") {
    return "admin";
  }
  const headerRole = req.headers["x-role"];
  if (typeof headerRole === "string") {
    return headerRole.toLowerCase();
  }
  return "user";
}

function requireRole(roles) {
  return (req, res, next) => {
    const role = getRoleFromHeaders(req);
    if (roles.includes(role)) {
      return next();
    }
    return res.status(403).json({ message: "Acceso denegado" });
  };
}

const requireAdmin = requireRole(["admin"]);
const requireManager = requireRole(["admin", "manager"]);

app.get("/api/games", (req, res) => {
  const query = req.query.search ? `%${req.query.search}%` : "%";
  db.all(
    "SELECT * FROM games WHERE title LIKE ? OR platform LIKE ? OR genre LIKE ?",
    [query, query, query],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Error consultando juegos" });
      }
      return res.json(rows);
    }
  );
});

app.get("/api/igdb/search", async (req, res) => {
  const query = (req.query.query || "").trim();
  if (!query) {
    return res.status(400).json({ message: "Falta el parametro query" });
  }

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    return res.status(500).json({ message: "Credenciales IGDB no configuradas" });
  }

  const token = await getIgdbToken();
  if (!token) {
    return res.status(500).json({ message: "No se pudo autenticar en IGDB" });
  }

  const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": IGDB_CLIENT_ID,
      Authorization: `Bearer ${token}`
    },
    body: `fields name,cover.url,genres.name,summary,platforms.name; search "${sanitizeQuery(query)}"; limit 8;`
  });

  if (!igdbResponse.ok) {
    return res.status(500).json({ message: "Error consultando IGDB" });
  }

  const data = await igdbResponse.json();
  const normalized = data.map((item) => ({
    id: item.id,
    title: item.name,
    image_url: item.cover && item.cover.url
      ? item.cover.url
          .replace("t_thumb", "t_cover_big")
          .replace(/^\/\//, "https://")
      : "",
    genres: item.genres ? item.genres.map((genre) => genre.name).join(", ") : "",
    platforms: item.platforms
      ? item.platforms.map((platform) => platform.name).join(", ")
      : "",
    description: item.summary || ""
  }));

  return res.json(normalized);
});

app.get("/api/games/:id", (req, res) => {
  db.get("SELECT * FROM games WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ message: "Juego no encontrado" });
    }
    return res.json(row);
  });
});

app.post("/api/games", requireManager, (req, res) => {
  const { title, price, platform, genre, image_url, description, stock } = req.body;
  const safeTitle = typeof title === "string" ? title.trim() : "";
  const priceValue = Number(String(price).replace(",", "."));
  const stockValue = Number.isFinite(Number(String(stock).replace(",", ".")))
    ? Number(String(stock).replace(",", "."))
    : 0;

  if (!safeTitle || !Number.isFinite(priceValue)) {
    return res.status(400).json({ message: "Titulo y precio son obligatorios" });
  }
  db.run(
    "INSERT INTO games (title, price, platform, genre, image_url, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      safeTitle,
      priceValue,
      platform || "",
      genre || "",
      image_url || "",
      description || "",
      stockValue
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error creando juego" });
      }
      return res.status(201).json({ id: this.lastID });
    }
  );
});

app.put("/api/games/:id", requireManager, (req, res) => {
  const { title, price, platform, genre, image_url, description, stock } = req.body;
  const safeTitle = typeof title === "string" ? title.trim() : "";
  const priceValue = Number(String(price).replace(",", "."));
  const stockValue = Number.isFinite(Number(String(stock).replace(",", ".")))
    ? Number(String(stock).replace(",", "."))
    : 0;

  if (!safeTitle || !Number.isFinite(priceValue)) {
    return res.status(400).json({ message: "Titulo y precio son obligatorios" });
  }
  db.run(
    "UPDATE games SET title = ?, price = ?, platform = ?, genre = ?, image_url = ?, description = ?, stock = ? WHERE id = ?",
    [
      safeTitle,
      priceValue,
      platform || "",
      genre || "",
      image_url || "",
      description || "",
      stockValue,
      req.params.id
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error actualizando juego" });
      }
      return res.json({ updated: this.changes });
    }
  );
});

app.delete("/api/games/:id", requireManager, (req, res) => {
  db.run("DELETE FROM games WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ message: "Error eliminando juego" });
    }
    return res.json({ deleted: this.changes });
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  const passwordHash = hashPassword(password);

  db.run(
    "INSERT INTO users (name, email, password_hash, is_admin, role) VALUES (?, ?, ?, 0, 'user')",
    [name, email, passwordHash],
    function (err) {
      if (err) {
        return res.status(400).json({ message: "Email ya registrado" });
      }
      return res.status(201).json({ id: this.lastID, name, email, role: "user" });
    }
  );
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const passwordHash = hashPassword(password);
  db.get(
    "SELECT id, name, email, role, is_admin FROM users WHERE email = ? AND password_hash = ?",
    [email, passwordHash],
    (err, row) => {
      if (err || !row) {
        return res.status(401).json({ message: "Credenciales invalidas" });
      }
      const role = row.role || (row.is_admin ? "admin" : "user");
      return res.json({
        id: row.id,
        name: row.name,
        email: row.email,
        role,
        is_admin: row.is_admin ? 1 : 0
      });
    }
  );
});

app.get("/api/users", requireAdmin, (req, res) => {
  db.all("SELECT id, name, email, role FROM users ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error consultando usuarios" });
    }
    return res.json(rows);
  });
});

app.post("/api/users", requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body;
  const safeName = typeof name === "string" ? name.trim() : "";
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const safeRole = ["user", "manager", "admin"].includes(role) ? role : "user";
  if (!safeName || !safeEmail || !password) {
    return res.status(400).json({ message: "Nombre, email y password son obligatorios" });
  }
  const passwordHash = hashPassword(password);
  const isAdmin = safeRole === "admin" ? 1 : 0;
  db.run(
    "INSERT INTO users (name, email, password_hash, is_admin, role) VALUES (?, ?, ?, ?, ?)",
    [safeName, safeEmail, passwordHash, isAdmin, safeRole],
    function (err) {
      if (err) {
        return res.status(400).json({ message: "Email ya registrado" });
      }
      return res.status(201).json({ id: this.lastID, name: safeName, email: safeEmail, role: safeRole });
    }
  );
});

app.put("/api/users/:id", requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body;
  const safeName = typeof name === "string" ? name.trim() : "";
  const safeEmail = typeof email === "string" ? email.trim() : "";
  const safeRole = ["user", "manager", "admin"].includes(role) ? role : "user";
  if (!safeName || !safeEmail) {
    return res.status(400).json({ message: "Nombre y email son obligatorios" });
  }
  const isAdmin = safeRole === "admin" ? 1 : 0;
  const params = [safeName, safeEmail, safeRole, isAdmin, req.params.id];
  let sql = "UPDATE users SET name = ?, email = ?, role = ?, is_admin = ?";
  if (password) {
    sql += ", password_hash = ?";
    params.splice(4, 0, hashPassword(password));
  }
  sql += " WHERE id = ?";

  db.run(sql, params, function (err) {
    if (err) {
      return res.status(500).json({ message: "Error actualizando usuario" });
    }
    return res.json({ updated: this.changes });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
