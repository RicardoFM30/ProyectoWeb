const crypto = require("crypto");
const express = require("express");
const fetch = require("node-fetch");
const AbortController = global.AbortController || require("abort-controller");
const path = require("path");
const { db, initDb, seedDb } = require("./db");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3000;
const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const HF_API_TOKEN = process.env.HF_API_TOKEN;
let igdbToken = null;
let igdbTokenExpiry = 0;

initDb();
seedDb();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; object-src 'none'; base-uri 'self'"
  );
  next();
});
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

async function runHfClassification(text, labels) {
  if (!HF_API_TOKEN) {
    return { error: "HF_API_TOKEN no configurado" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          candidate_labels: labels,
          multi_label: true
        }
      }),
      signal: controller.signal
    }
  );

  clearTimeout(timeoutId);

  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json();
      if (errBody.error) {
        detail = errBody.error;
      } else if (errBody.estimated_time) {
        detail = `Modelo cargando, espera ${Math.ceil(errBody.estimated_time)}s y reintenta`;
      }
    } catch (_) {}
    return { error: `HF ${response.status}: ${detail || response.statusText}` };
  }

  const payload = await response.json();
  if (payload && payload.estimated_time) {
    return { error: `Modelo cargando, espera ${Math.ceil(payload.estimated_time)}s y reintenta` };
  }

  let result = [];

  if (payload && Array.isArray(payload.labels) && Array.isArray(payload.scores)) {
    result = payload.labels.map((label, index) => ({
      label,
      score: Number((payload.scores[index] || 0).toFixed(4))
    }));
  } else if (Array.isArray(payload) && payload.length) {
    const first = payload[0];
    if (first && typeof first === "object" && "label" in first && "score" in first) {
      result = payload.map((item) => ({
        label: item.label,
        score: Number((item.score || 0).toFixed(4))
      }));
    } else if (Array.isArray(first) && first.length) {
      const nestedFirst = first[0];
      if (nestedFirst && typeof nestedFirst === "object" && "label" in nestedFirst && "score" in nestedFirst) {
        result = first.map((item) => ({
          label: item.label,
          score: Number((item.score || 0).toFixed(4))
        }));
      }
    }
  }

  if (!result.length) {
    const shape = Array.isArray(payload)
      ? `array(${payload.length})`
      : payload && typeof payload === "object"
      ? Object.keys(payload).join(",") || "object"
      : typeof payload;
    return { error: `Respuesta invalida de Hugging Face (${shape})` };
  }

  return { result };
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

function getUserId(req) {
  const raw = req.headers["x-user-id"];
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function requireUser(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Usuario no autenticado" });
  }
  req.userId = userId;
  return next();
}

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

app.get("/api/favorites", requireUser, (req, res) => {
  db.all(
    "SELECT game_id FROM favorites WHERE user_id = ?",
    [req.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Error consultando favoritos" });
      }
      return res.json(rows.map((row) => row.game_id));
    }
  );
});

app.post("/api/favorites", requireUser, (req, res) => {
  const { gameId } = req.body;
  const safeGameId = Number(gameId);
  if (!Number.isFinite(safeGameId)) {
    return res.status(400).json({ message: "Juego invalido" });
  }
  db.run(
    "INSERT OR IGNORE INTO favorites (user_id, game_id) VALUES (?, ?)",
    [req.userId, safeGameId],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error guardando favorito" });
      }
      return res.status(201).json({ ok: true });
    }
  );
});

app.delete("/api/favorites/:gameId", requireUser, (req, res) => {
  const safeGameId = Number(req.params.gameId);
  if (!Number.isFinite(safeGameId)) {
    return res.status(400).json({ message: "Juego invalido" });
  }
  db.run(
    "DELETE FROM favorites WHERE user_id = ? AND game_id = ?",
    [req.userId, safeGameId],
    function (err) {
      if (err) {
        return res.status(500).json({ message: "Error eliminando favorito" });
      }
      return res.json({ deleted: this.changes });
    }
  );
});

app.get("/api/orders", requireUser, (req, res) => {
  db.all(
    "SELECT id, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC",
    [req.userId],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ message: "Error consultando pedidos" });
      }
      if (!orders.length) {
        return res.json([]);
      }
      const ids = orders.map((order) => order.id);
      const placeholders = ids.map(() => "?").join(",");
      db.all(
        `SELECT order_id, game_id, title, price, qty FROM order_items WHERE order_id IN (${placeholders})`,
        ids,
        (itemsErr, items) => {
          if (itemsErr) {
            return res.status(500).json({ message: "Error consultando items" });
          }
          const grouped = {};
          items.forEach((item) => {
            if (!grouped[item.order_id]) {
              grouped[item.order_id] = [];
            }
            grouped[item.order_id].push(item);
          });
          const withItems = orders.map((order) => ({
            ...order,
            items: grouped[order.id] || []
          }));
          return res.json(withItems);
        }
      );
    }
  );
});

app.post("/api/orders", requireUser, (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) {
    return res.status(400).json({ message: "Carrito vacio" });
  }
  const normalized = items
    .map((item) => ({
      game_id: Number(item.id),
      title: String(item.title || "").trim(),
      price: Number(item.price),
      qty: Number(item.qty)
    }))
    .filter((item) =>
      Number.isFinite(item.game_id) &&
      item.title &&
      Number.isFinite(item.price) &&
      Number.isFinite(item.qty) &&
      item.qty > 0
    );

  if (!normalized.length) {
    return res.status(400).json({ message: "Items invalidos" });
  }

  const total = normalized.reduce((sum, item) => sum + item.price * item.qty, 0);

  db.serialize(() => {
    db.run(
      "INSERT INTO orders (user_id, total) VALUES (?, ?)",
      [req.userId, Number(total.toFixed(2))],
      function (orderErr) {
        if (orderErr) {
          return res.status(500).json({ message: "Error creando pedido" });
        }
        const orderId = this.lastID;
        const stmt = db.prepare(
          "INSERT INTO order_items (order_id, game_id, title, price, qty) VALUES (?, ?, ?, ?, ?)"
        );
        normalized.forEach((item) => {
          stmt.run([orderId, item.game_id, item.title, item.price, item.qty]);
        });
        stmt.finalize((finalErr) => {
          if (finalErr) {
            return res.status(500).json({ message: "Error guardando items" });
          }
          return res.status(201).json({ id: orderId });
        });
      }
    );
  });
});

app.post("/api/ai/classify", async (req, res) => {
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  const labels = Array.isArray(req.body.labels)
    ? req.body.labels.filter((label) => typeof label === "string" && label.trim())
    : [];

  if (!text) {
    return res.status(400).json({ message: "El texto es obligatorio" });
  }

  const safeLabels = labels.length
    ? labels.map((label) => label.trim()).slice(0, 8)
    : ["accion", "rpg", "aventura", "estrategia", "terror", "casual"];

  try {
    const hf = await runHfClassification(text, safeLabels);
    if (hf.error) {
      return res.status(500).json({ message: hf.error });
    }
    return res.json({ labels: hf.result });
  } catch (error) {
    console.error("HF classify error:", error && error.message ? error.message : error);
    if (error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return res.status(504).json({ message: "El modelo tarda en responder, reintenta en unos segundos" });
    }
    return res.status(500).json({ message: "Error en inferencia de IA" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

if (!isServerless) {
  app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
  });
}

module.exports = app;
