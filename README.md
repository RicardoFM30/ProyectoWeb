# Tienda web de videojuegos (demo)

Proyecto academico con frontend en React (sin build) y backend en Express + SQLite.

## Requisitos
- Node.js 12+
- npm

## Como ejecutar
1. Instalar dependencias:
   - `npm install`
2. Iniciar el servidor:
   - `npm start`
3. Abrir en el navegador en localhost:3000

## Configurar IGDB
1. Crea un archivo `.env` en la raiz con:
   - `IGDB_CLIENT_ID=tu_client_id`
   - `IGDB_CLIENT_SECRET=tu_client_secret`
2. Reinicia el servidor para usar la busqueda desde el panel admin.

## Ver la base de datos en DBeaver
1. Crea una nueva conexion SQLite.
2. Selecciona el archivo `data/store.db` como base de datos.
3. Navega las tablas `games` y `users`.

## Seed con IGDB (20 juegos)
- Ejecuta `npm run seed:igdb` para reemplazar los juegos por 20 de IGDB.

## Credenciales demo
- Admin: admin@demo.com
- Password: admin123

## Roles
- Usuario: navegar, buscar y simular compras.
- Encargado: puede gestionar productos.
- Administrador: gestiona productos y usuarios.

## Notas
- El panel usa un header simple `x-role` desde el frontend.
- Las imagenes usan placeholders y se pueden reemplazar.
- El checkout es solo visual, no hay pagos reales.
- Si necesitas reiniciar datos, borra `data/store.db` y vuelve a iniciar el servidor.
- Si agregaste productos sin precio, borra `data/store.db` para limpiar registros invalidos.

## Historico de cambios
- Ver `CHANGELOG.md`
