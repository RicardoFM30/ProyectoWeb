const { useEffect, useMemo, useState } = React;

const rawApiBaseUrl = (window.__API_BASE_URL__ || "").trim();
const API_BASE_URL = rawApiBaseUrl.includes("TU-API-RENDER") ? "" : rawApiBaseUrl.replace(/\/$/, "");

const buildApiUrl = (path) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

const api = async (path, options = {}) => {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: mergedHeaders
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Error inesperado");
  }

  return response.json();
};

const loadFallbackGames = async (query = "") => {
  const response = await fetch("/fallback-games.json");
  if (!response.ok) {
    throw new Error("No se pudo cargar el catalogo");
  }
  const games = await response.json();
  const term = query.trim().toLowerCase();
  if (!term) {
    return games;
  }
  return games.filter((game) => {
    const title = (game.title || "").toLowerCase();
    const genre = (game.genre || "").toLowerCase();
    const platform = (game.platform || "").toLowerCase();
    return title.includes(term) || genre.includes(term) || platform.includes(term);
  });
};

const getStored = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const getRole = (user) => {
  if (!user) {
    return "user";
  }
  if (user.is_admin) {
    return "admin";
  }
  if (user.role) {
    return user.role;
  }
  return user.is_admin ? "admin" : "user";
};

function App() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("catalog");
  const [selectedGame, setSelectedGame] = useState(null);
  const [user, setUser] = useState(() => getStored("user", null));
  const [cart, setCart] = useState(() => getStored("cart", []));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [orders, setOrders] = useState([]);
  const [genreFilter, setGenreFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [page, setPage] = useState(1);
  const [aiText, setAiText] = useState("");
  const [aiLabels, setAiLabels] = useState("accion,aventura,rpg,mundo abierto,supervivencia,terror,estrategia,simulacion,cooperativo,multijugador,pvp,pve,rompecabezas,plataformas,roguelike,metroidvania,narrativo,stealth,ciencia ficcion,fantasia,arcade,casual");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState([]);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    const applyPath = () => {
      const path = window.location.pathname;
      const routeMap = {
        "/": "catalog",
        "/login": "login",
        "/register": "register",
        "/cart": "cart",
        "/checkout": "checkout",
        "/admin": "admin",
        "/orders": "orders",
        "/detail": "detail",
        "/ai-lab": "ai-lab"
      };
      const nextView = routeMap[path] || "catalog";
      if (nextView === "detail" && !selectedGame) {
        setView("catalog");
        window.history.replaceState({}, "", "/");
        return;
      }
      setView(nextView);
    };
    applyPath();
    window.addEventListener("popstate", applyPath);
    return () => window.removeEventListener("popstate", applyPath);
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  useEffect(() => {
    if (user && user.id) {
      fetchFavorites();
      fetchOrders();
    } else {
      setFavorites([]);
      setOrders([]);
    }
  }, [user]);

  const fetchGames = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/games?search=${encodeURIComponent(query)}`);
      setGames(data);
    } catch (err) {
      try {
        const fallbackGames = await loadFallbackGames(query);
        setGames(fallbackGames);
      } catch (fallbackError) {
        setError(fallbackError.message || err.message || "Error inesperado");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchGames(search);
    setPage(1);
  };

  const handleSelect = (game) => {
    setSelectedGame(game);
    setView("detail");
    window.history.pushState({}, "", "/detail");
  };

  const addToCart = (game) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === game.id);
      if (existing) {
        return prev.map((item) =>
          item.id === game.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...game, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQty = (id, qty) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const handleLogin = async (payload) => {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const normalized = {
      ...data,
      role: data.is_admin ? "admin" : data.role || "user"
    };
    setUser(normalized);
    setView("catalog");
    window.history.pushState({}, "", "/");
  };

  const handleRegister = async (payload) => {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const normalized = {
      ...data,
      role: data.is_admin ? "admin" : data.role || "user"
    };
    setUser(normalized);
    setView("catalog");
    window.history.pushState({}, "", "/");
  };

  const handleLogout = () => {
    setUser(null);
    setView("catalog");
    window.history.pushState({}, "", "/");
  };
  const navigateTo = (nextView) => {
    const pathMap = {
      catalog: "/",
      login: "/login",
      register: "/register",
      cart: "/cart",
      checkout: "/checkout",
      admin: "/admin",
      orders: "/orders",
      detail: "/detail",
      "ai-lab": "/ai-lab"
    };
    setView(nextView);
    window.history.pushState({}, "", pathMap[nextView] || "/");
  };

  const handleSaveGame = async (payload, isEdit) => {
    const role = getRole(user);
    const options = {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "x-role": role
      },
      body: JSON.stringify(payload)
    };
    const path = isEdit ? `/api/games/${payload.id}` : "/api/games";
    await api(path, options);
    await fetchGames(search);
  };

  const handleDeleteGame = async (id) => {
    const role = getRole(user);
    await api(`/api/games/${id}`, {
      method: "DELETE",
      headers: {
        "x-role": role
      }
    });
    await fetchGames(search);
  };

  const fetchUsers = async () => {
    const role = getRole(user);
    const data = await api("/api/users", {
      headers: {
        "x-role": role
      }
    });
    setUsers(data);
  };

  const handleSaveUser = async (payload, isEdit) => {
    const role = getRole(user);
    const options = {
      method: isEdit ? "PUT" : "POST",
      headers: {
        "x-role": role
      },
      body: JSON.stringify(payload)
    };
    const path = isEdit ? `/api/users/${payload.id}` : "/api/users";
    await api(path, options);
    await fetchUsers();
  };

  const fetchFavorites = async () => {
    if (!user || !user.id) {
      return;
    }
    const data = await api("/api/favorites", {
      headers: {
        "x-user-id": user.id
      }
    });
    setFavorites(data);
  };

  const toggleFavorite = async (gameId) => {
    if (!user || !user.id) {
      navigateTo("login");
      return;
    }
    const exists = favorites.includes(gameId);
    if (exists) {
      await api(`/api/favorites/${gameId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user.id
        }
      });
      setFavorites((prev) => prev.filter((id) => id !== gameId));
    } else {
      await api("/api/favorites", {
        method: "POST",
        headers: {
          "x-user-id": user.id
        },
        body: JSON.stringify({ gameId })
      });
      setFavorites((prev) => [...prev, gameId]);
    }
  };

  const fetchOrders = async () => {
    if (!user || !user.id) {
      return;
    }
    const data = await api("/api/orders", {
      headers: {
        "x-user-id": user.id
      }
    });
    setOrders(data);
  };

  const handleCreateOrder = async () => {
    if (!user || !user.id) {
      navigateTo("login");
      return;
    }
    await api("/api/orders", {
      method: "POST",
      headers: {
        "x-user-id": user.id
      },
      body: JSON.stringify({ items: cart })
    });
    setCart([]);
    await fetchOrders();
    navigateTo("orders");
  };

  const handleAiClassify = async (event) => {
    event.preventDefault();
    setAiLoading(true);
    setAiError("");
    setAiResult([]);
    try {
      const labels = aiLabels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const data = await api("/api/ai/classify", {
        method: "POST",
        body: JSON.stringify({
          text: aiText,
          labels
        })
      });
      setAiResult(Array.isArray(data.labels) ? data.labels : []);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const visibleGames = games.filter(
    (game) => game && game.title && Number.isFinite(Number(game.price))
  );
  const genres = Array.from(
    new Set(visibleGames.map((game) => game.genre).filter(Boolean))
  ).sort();
  const platforms = Array.from(
    new Set(visibleGames.map((game) => game.platform).filter(Boolean))
  ).sort();
  const filteredGames = useMemo(() => {
    const minValue = priceMin ? Number(String(priceMin).replace(",", ".")) : null;
    const maxValue = priceMax ? Number(String(priceMax).replace(",", ".")) : null;
    return visibleGames.filter((game) => {
      if (genreFilter !== "all" && game.genre !== genreFilter) {
        return false;
      }
      if (platformFilter !== "all" && game.platform !== platformFilter) {
        return false;
      }
      const priceValue = Number(game.price);
      if (Number.isFinite(minValue) && priceValue < minValue) {
        return false;
      }
      if (Number.isFinite(maxValue) && priceValue > maxValue) {
        return false;
      }
      return true;
    });
  }, [visibleGames, genreFilter, platformFilter, priceMin, priceMax]);
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / itemsPerPage));
  const pagedGames = filteredGames.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  const role = getRole(user);
  const canManageGames = role === "admin" || role === "manager";
  const canManageUsers = role === "admin";
  const aiAds = [
    {
      title: "NovaBox X",
      subtitle: "Nueva consola con trazado de rayos y carga ultrarrapida",
      image: "/media/ad-console-novabox.svg",
      badge: "Lanzamiento",
      price: "Desde $499"
    },
    {
      title: "TripVago Deals",
      subtitle: "Compara hoteles y cierra tu escapada gamer al mejor precio",
      image: "/media/ad-tripvago-deals.svg",
      badge: "Viajes",
      price: "Ahorra hasta 35%"
    },
    {
      title: "Echoes of Mars",
      subtitle: "Oferta flash del fin de semana en clave digital",
      image: "/media/ad-echoes-offer.svg",
      badge: "-60%",
      price: "$9.99"
    },
    {
      title: "Pulse Strike Arena Pass",
      subtitle: "Bundle competitivo con skins legendarias",
      image: "/media/ad-pulse-bundle.svg",
      badge: "Bundle",
      price: "$14.99"
    }
  ];

  useEffect(() => {
    setPage(1);
  }, [genreFilter, platformFilter, priceMin, priceMax]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__dot" />
          <span>Neon Keys</span>
        </div>
        <nav className="nav">
          <button
            className={view === "catalog" ? "active" : ""}
            onClick={() => navigateTo("catalog")}
          >
            Catalogo
          </button>
          <button
            className={view === "cart" ? "active" : ""}
            onClick={() => navigateTo("cart")}
          >
            Carrito ({cartCount})
          </button>
          {user ? (
            <button
              className={view === "orders" ? "active" : ""}
              onClick={() => navigateTo("orders")}
            >
              Mis compras
            </button>
          ) : null}
          {user && canManageGames ? (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => navigateTo("admin")}
            >
              Panel
            </button>
          ) : null}
          <button
            className={view === "ai-lab" ? "active" : ""}
            onClick={() => navigateTo("ai-lab")}
          >
            Tu proximo juego
          </button>
          {user ? (
            <button onClick={handleLogout}>Salir</button>
          ) : (
            <button
              className={view === "login" ? "active" : ""}
              onClick={() => navigateTo("login")}
            >
              Entrar
            </button>
          )}
        </nav>
      </header>

      <main className="main">
        {view === "catalog" && (
          <>
            <section className="hero">
              <h1>Tienda demo de claves digitales</h1>
              <p>
                Catalogo listo para buscar juegos, ver detalles y simular una
                compra sin pagos reales.
              </p>
              <form className="search" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Buscar por titulo, genero o plataforma"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button className="btn" type="submit">
                  Buscar
                </button>
              </form>
              <div className="filters">
                <select
                  value={genreFilter}
                  onChange={(event) => setGenreFilter(event.target.value)}
                >
                  <option value="all">Todos los generos</option>
                  {genres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
                <select
                  value={platformFilter}
                  onChange={(event) => setPlatformFilter(event.target.value)}
                >
                  <option value="all">Todas las plataformas</option>
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Precio min"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Precio max"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                />
              </div>
            </section>
            {loading && <p>Cargando juegos...</p>}
            {error && <p>{error}</p>}
            <section className="catalog-layout">
              <div>
                <section className="grid">
                  {pagedGames.map((game) => (
                    <article className="card" key={game.id}>
                      <img src={game.image_url} alt={game.title} />
                      <button
                        className={`fav-btn ${favorites.includes(game.id) ? "active" : ""}`}
                        type="button"
                        onClick={() => toggleFavorite(game.id)}
                        aria-label="Favorito"
                      >
                        ★
                      </button>
                      <h3>{game.title}</h3>
                      <p className="price">${Number(game.price).toFixed(2)}</p>
                      <span className="badge">{game.genre}</span>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <button className="btn" onClick={() => handleSelect(game)}>
                          Ver detalle
                        </button>
                        <button className="btn btn-ghost" onClick={() => addToCart(game)}>
                          Agregar
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
                <div className="pagination">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </button>
                  <span>
                    Pagina {page} de {totalPages}
                  </span>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <aside className="ads-rail">
                <h3>Anuncios IA</h3>
                {aiAds.map((ad) => (
                  <article className="ad-card" key={ad.title}>
                    <img src={ad.image} alt={ad.title} loading="lazy" />
                    <div>
                      <span className="ad-badge">{ad.badge}</span>
                      <strong>{ad.title}</strong>
                      <p className="muted">{ad.subtitle}</p>
                      <p className="ad-price">{ad.price}</p>
                    </div>
                  </article>
                ))}
              </aside>
            </section>
          </>
        )}

        {view === "detail" && selectedGame && (
          <section className="panel">
            <h2>{selectedGame.title}</h2>
            <p>{selectedGame.description}</p>
            <p className="price">${selectedGame.price.toFixed(2)}</p>
            <p>Genero: {selectedGame.genre}</p>
            <p>Plataforma: {selectedGame.platform}</p>
            <p>Stock: {selectedGame.stock}</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn" onClick={() => addToCart(selectedGame)}>
                Agregar al carrito
              </button>
              <button
                className={`btn btn-ghost ${
                  favorites.includes(selectedGame.id) ? "active" : ""
                }`}
                onClick={() => toggleFavorite(selectedGame.id)}
              >
                {favorites.includes(selectedGame.id) ? "Favorito" : "Guardar"}
              </button>
              <button className="btn btn-ghost" onClick={() => navigateTo("catalog")}
              >
                Volver
              </button>
            </div>
          </section>
        )}

        {view === "cart" && (
          <section className="panel">
            <h2>Carrito</h2>
            {cart.length === 0 ? (
              <p>El carrito esta vacio.</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>${item.price.toFixed(2)}</p>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(event) =>
                          updateQty(item.id, Number(event.target.value))
                        }
                        style={{ width: "60px" }}
                      />
                      <button className="btn btn-ghost" onClick={() => removeFromCart(item.id)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                <p style={{ marginTop: "12px" }}>
                  Total: <strong>${total.toFixed(2)}</strong>
                </p>
                <button className="btn" onClick={() => navigateTo("checkout")}
                >
                  Ir a checkout
                </button>
              </>
            )}
          </section>
        )}

        {view === "checkout" && (
          <section className="panel">
            <h2>Checkout simulado</h2>
            <form className="form">
              <input type="text" placeholder="Nombre completo" required />
              <input type="email" placeholder="Email" required />
              <input type="text" placeholder="Direccion" required />
              <button className="btn" type="button" onClick={handleCreateOrder}
              >
                Confirmar (simulado)
              </button>
            </form>
          </section>
        )}

        {view === "orders" && (
          <section className="panel">
            <h2>Historial de compras</h2>
            {!orders.length ? (
              <p>No tienes compras registradas.</p>
            ) : (
              <div className="order-list">
                {orders.map((order) => (
                  <div className="order-card" key={order.id}>
                    <div className="order-header">
                      <strong>Pedido #{order.id}</strong>
                      <span>${Number(order.total).toFixed(2)}</span>
                    </div>
                    <p className="muted">{new Date(order.created_at).toLocaleString()}</p>
                    <div className="order-items">
                      {order.items.map((item) => (
                        <div className="order-item" key={`${order.id}-${item.game_id}`}>
                          <span>{item.title}</span>
                          <span>x{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {view === "login" && (
          <AuthForm
            title="Iniciar sesion"
            onSubmit={handleLogin}
            onSwitch={() => navigateTo("register")}
            switchLabel="No tienes cuenta? Registrate"
          />
        )}

        {view === "register" && (
          <AuthForm
            title="Crear cuenta"
            onSubmit={handleRegister}
            onSwitch={() => navigateTo("login")}
            switchLabel="Ya tienes cuenta? Entra aqui"
            showName
          />
        )}

        {view === "admin" && (
          <AdminPanel
            games={games}
            onSave={handleSaveGame}
            onDelete={handleDeleteGame}
            users={users}
            onFetchUsers={fetchUsers}
            onSaveUser={handleSaveUser}
            canManageUsers={canManageUsers}
            canManageGames={canManageGames}
          />
        )}

        {view === "ai-lab" && (
          <section className="panel ai-lab">
            <h2>Tu proximo juego</h2>
            <p className="muted">
              Describe tu idea y la IA estima el perfil de genero para ayudarte a definir tu proximo proyecto.
            </p>

            <form className="form" onSubmit={handleAiClassify}>
              <textarea
                rows="4"
                placeholder="Escribe una idea breve de videojuego para clasificarla por etiquetas"
                value={aiText}
                onChange={(event) => setAiText(event.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Etiquetas separadas por coma"
                value={aiLabels}
                onChange={(event) => setAiLabels(event.target.value)}
              />
              <button className="btn" type="submit" disabled={aiLoading}>
                {aiLoading ? "Analizando..." : "Ejecutar inferencia"}
              </button>
            </form>

            {aiError && <p>{aiError}</p>}

            {aiResult.length > 0 && (
              <div className="ai-results">
                {aiResult.map((item) => (
                  <div className="ai-score" key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{Math.round(item.score * 100)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="ai-media-grid">
              <article className="ai-media-card">
                <h3>Escena: Neon District</h3>
                <img
                  src="/media/neon-district.svg"
                  alt="Escena neon creada para la pagina"
                  loading="lazy"
                />
                <p className="muted">Ilustracion original para ambientar ideas de accion urbana.</p>
              </article>

              <article className="ai-media-card">
                <h3>Escena: Outbreak Shelter</h3>
                <img src="/media/outbreak-shelter.svg" alt="Escena de supervivencia con refugio" loading="lazy" />
                <p className="muted">
                  Ilustracion original pensada para conceptos survival-horror y tension narrativa.
                </p>
              </article>

              <article className="ai-media-card">
                <h3>Escena: Puzzle Core</h3>
                <img src="/media/puzzle-core.svg" alt="Escena de laboratorio con puzles" loading="lazy" />
                <p className="muted">Ilustracion original enfocada en rompecabezas y estrategia.</p>
              </article>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Demo academica. Pagos y licencias no reales.</p>
      </footer>
    </div>
  );
}

function AuthForm({ title, onSubmit, onSwitch, switchLabel, showName }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = showName
        ? form
        : { email: form.email, password: form.password };
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h2>{title}</h2>
      <form className="form" onSubmit={handleSubmit}>
        {showName && (
          <input
            type="text"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => handleChange("name", event.target.value)}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(event) => handleChange("email", event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => handleChange("password", event.target.value)}
          required
        />
        {error && <p>{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Cargando..." : "Enviar"}
        </button>
      </form>
      <button className="btn btn-ghost" onClick={onSwitch}>
        {switchLabel}
      </button>
    </section>
  );
}

function AdminPanel({
  games,
  onSave,
  onDelete,
  users,
  onFetchUsers,
  onSaveUser,
  canManageUsers,
  canManageGames
}) {
  const emptyForm = {
    id: "",
    title: "",
    price: "",
    platform: "PC",
    genre: "Accion",
    image_url: "",
    description: "",
    stock: ""
  };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [igdbQuery, setIgdbQuery] = useState("");
  const [igdbResults, setIgdbResults] = useState([]);
  const [igdbError, setIgdbError] = useState("");
  const [igdbLoading, setIgdbLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(canManageUsers ? "products" : "products");
  const emptyUser = {
    id: "",
    name: "",
    email: "",
    password: "",
    role: "user"
  };
  const [userForm, setUserForm] = useState(emptyUser);
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    if (activeTab === "users" && canManageUsers) {
      onFetchUsers();
    }
  }, [activeTab, canManageUsers, onFetchUsers]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (game) => {
    setForm({ ...game });
  };

  const handleIgdbSearch = async () => {
    if (!igdbQuery.trim()) {
      return;
    }
    setIgdbLoading(true);
    setIgdbError("");
    try {
      const results = await api(
        `/api/igdb/search?query=${encodeURIComponent(igdbQuery.trim())}`
      );
      setIgdbResults(results);
    } catch (err) {
      setIgdbError(err.message);
    } finally {
      setIgdbLoading(false);
    }
  };

  const handleUseIgdb = (item) => {
    const genre = item.genres ? item.genres.split(",")[0].trim() : form.genre;
    const platform = item.platforms
      ? item.platforms.split(",")[0].trim()
      : form.platform;
    setForm((prev) => ({
      ...prev,
      title: item.title || prev.title,
      image_url: item.image_url || prev.image_url,
      description: item.description || prev.description,
      genre: genre || prev.genre,
      platform: platform || prev.platform
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      if (!form.title.trim()) {
        setMessage("El titulo es obligatorio");
        return;
      }
      const priceValue = Number(String(form.price).replace(",", "."));
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        setMessage("El precio debe ser un numero valido");
        return;
      }
      const stockValue = Number(String(form.stock).replace(",", "."));
      const payload = {
        ...form,
        price: priceValue,
        stock: Number.isFinite(stockValue) ? stockValue : 0
      };
      const isEdit = Boolean(form.id);
      await onSave(payload, isEdit);
      setForm(emptyForm);
      setMessage("Producto guardado");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleUserChange = (field, value) => {
    setUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUserEdit = (user) => {
    setUserForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role || "user"
    });
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setUserMessage("");
    try {
      if (!userForm.name.trim() || !userForm.email.trim()) {
        setUserMessage("Nombre y email son obligatorios");
        return;
      }
      const payload = {
        ...userForm,
        name: userForm.name.trim(),
        email: userForm.email.trim()
      };
      if (!payload.id && !payload.password) {
        setUserMessage("Password obligatorio para crear usuario");
        return;
      }
      const isEdit = Boolean(payload.id);
      await onSaveUser(payload, isEdit);
      setUserForm(emptyUser);
      setUserMessage("Usuario guardado");
    } catch (err) {
      setUserMessage(err.message);
    }
  };

  return (
    <section className="panel admin-shell">
      <div className="admin-header">
        <div>
          <h2>Panel de administracion</h2>
          <p className="muted">Control total de productos y usuarios.</p>
        </div>
        <div className="admin-tabs">
          <button
            className={activeTab === "products" ? "active" : ""}
            onClick={() => setActiveTab("products")}
          >
            Productos
          </button>
          {canManageUsers && (
            <button
              className={activeTab === "users" ? "active" : ""}
              onClick={() => setActiveTab("users")}
            >
              Usuarios
            </button>
          )}
        </div>
      </div>

      {activeTab === "products" && canManageGames && (
        <div className="admin-grid">
          <div className="panel admin-card">
            <h3>Importar desde IGDB</h3>
            <div className="inline-row">
              <input
                type="text"
                placeholder="Buscar en IGDB"
                value={igdbQuery}
                onChange={(event) => setIgdbQuery(event.target.value)}
              />
              <button className="btn" type="button" onClick={handleIgdbSearch}
              >
                {igdbLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {igdbError && <p>{igdbError}</p>}
            {igdbResults.length > 0 && (
              <div className="grid">
                {igdbResults.map((item) => (
                  <div className="card" key={item.id}>
                    {item.image_url && <img src={item.image_url} alt={item.title} />}
                    <h3>{item.title}</h3>
                    <p className="muted">{item.genres}</p>
                    <button className="btn" type="button" onClick={() => handleUseIgdb(item)}>
                      Usar datos
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel admin-card">
            <h3>Producto</h3>
            <form className="form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Titulo"
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                required
              />
              <div className="inline-row">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([,\.][0-9]+)?"
                  placeholder="Precio"
                  value={form.price}
                  onChange={(event) => handleChange("price", event.target.value)}
                  required
                />
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]+([,\.][0-9]+)?"
                  placeholder="Stock"
                  value={form.stock}
                  onChange={(event) => handleChange("stock", event.target.value)}
                />
              </div>
              <div className="inline-row">
                <input
                  type="text"
                  placeholder="Plataforma"
                  value={form.platform}
                  onChange={(event) => handleChange("platform", event.target.value)}
                />
                <input
                  type="text"
                  placeholder="Genero"
                  value={form.genre}
                  onChange={(event) => handleChange("genre", event.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="URL imagen"
                value={form.image_url}
                onChange={(event) => handleChange("image_url", event.target.value)}
              />
              <textarea
                placeholder="Descripcion"
                rows="3"
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
              />
              <button className="btn" type="submit">
                Guardar producto
              </button>
            </form>
            {message && <p>{message}</p>}
          </div>

          <div className="panel admin-card">
            <h3>Inventario</h3>
            <div className="admin-list">
              {games.map((game) => (
                <div className="admin-item" key={game.id}>
                  <div>
                    <strong>{game.title}</strong>
                    <p className="muted">${Number(game.price).toFixed(2)}</p>
                  </div>
                  <div className="inline-row">
                    <button className="btn" onClick={() => handleEdit(game)}>
                      Editar
                    </button>
                    <button className="btn btn-ghost" onClick={() => onDelete(game.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "users" && canManageUsers && (
        <div className="admin-grid">
          <div className="panel admin-card">
            <h3>Usuario</h3>
            <form className="form" onSubmit={handleUserSubmit}>
              <input
                type="text"
                placeholder="Nombre"
                value={userForm.name}
                onChange={(event) => handleUserChange("name", event.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={userForm.email}
                onChange={(event) => handleUserChange("email", event.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password (solo si cambia)"
                value={userForm.password}
                onChange={(event) => handleUserChange("password", event.target.value)}
              />
              <select
                value={userForm.role}
                onChange={(event) => handleUserChange("role", event.target.value)}
              >
                <option value="user">Usuario</option>
                <option value="manager">Encargado</option>
                <option value="admin">Administrador</option>
              </select>
              <button className="btn" type="submit">
                Guardar usuario
              </button>
            </form>
            {userMessage && <p>{userMessage}</p>}
          </div>

          <div className="panel admin-card">
            <h3>Usuarios registrados</h3>
            <div className="admin-list">
              {users.map((item) => (
                <div className="admin-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">{item.email}</p>
                  </div>
                  <div className="inline-row">
                    <span className="badge">{item.role || "user"}</span>
                    <button className="btn" onClick={() => handleUserEdit(item)}>
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
