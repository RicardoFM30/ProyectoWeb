# Tienda web de videojuegos (demo academica)

Proyecto academico fullstack con frontend React (sin build) y backend Express + SQLite.

Estado actual: ejecucion local unicamente (sin despliegue cloud activo).

## Requisitos
- Node.js 18+
- npm

## Variables de entorno
Crear archivo .env en la raiz:

- IGDB_CLIENT_ID=tu_client_id
- IGDB_CLIENT_SECRET=tu_client_secret
- HF_API_TOKEN=tu_token_huggingface

HF_API_TOKEN es obligatorio para usar la inferencia del IA Lab.

## Ejecucion local
1. Instalar dependencias:
   - npm install
2. Iniciar servidor:
   - npm start
3. Abrir en navegador:
   - http://localhost:3000

## Scripts
- npm start: levanta backend y frontend estatico
- npm run seed: inicializa/siembra base local
- npm run seed:igdb: reemplaza catalogo con 20 juegos de IGDB

## Credenciales demo
- Admin: admin@demo.com
- Password: admin123

## Funcionalidades
- Catalogo, detalle, carrito y checkout simulado
- Auth de registro/login
- Roles: user, admin
- Panel admin para productos y usuarios
- Filtros y paginacion
- Integracion con IGDB
- Tu proximo juego (clasificacion de texto con Hugging Face, modelo facebook/bart-large-mnli)
- Rail lateral de anuncios con creatividades SVG originales

## Cambios recientes documentados
- Historial tecnico completo en CHANGELOG.md
- Incluye lo agregado y luego retirado (intentos cloud y rollback a local)
- Incluye bitacora paso a paso de la sesion de trabajo (2026-04-07 a 2026-04-08)

## Base de datos local
- Archivo SQLite: data/store.db
- Si necesitas reset: elimina data/store.db y reinicia npm start

## Historico de cambios
- Ver CHANGELOG.md
