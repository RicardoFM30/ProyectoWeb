const { useEffect, useMemo, useState } = React;

const api = async (path, options = {}) => {
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const response = await fetch(path, {
    ...options,
    headers: mergedHeaders
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Error inesperado");
  }

  return response.json();
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
        "/detail": "detail"
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

  const fetchGames = async (query = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/games?search=${encodeURIComponent(query)}`);
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();
    fetchGames(search);
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
      detail: "/detail"
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

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const visibleGames = games.filter(
    (game) => game && game.title && Number.isFinite(Number(game.price))
  );
  const role = getRole(user);
  const canManageGames = role === "admin" || role === "manager";
  const canManageUsers = role === "admin";

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
          {user && canManageGames ? (
            <button
              className={view === "admin" ? "active" : ""}
              onClick={() => navigateTo("admin")}
            >
              Panel
            </button>
          ) : null}
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
            </section>
            {loading && <p>Cargando juegos...</p>}
            {error && <p>{error}</p>}
            <section className="grid">
              {visibleGames.map((game) => (
                <article className="card" key={game.id}>
                  <img src={game.image_url} alt={game.title} />
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
              <button className="btn btn-ghost" onClick={() => setView("catalog")}
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
              <button className="btn" type="button" onClick={() => navigateTo("catalog")}
              >
                Confirmar (simulado)
              </button>
            </form>
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
      </main>

      <footer className="footer">
        Demo academica. Pagos y licencias no reales.
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
