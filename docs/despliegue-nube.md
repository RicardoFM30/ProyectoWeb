# Despliegue en la nube

Este proyecto puede desplegarse en varios servicios. Para Express + SQLite, la opcion mas simple es Render con disco persistente.

## Opcion recomendada: Render (compatible con SQLite)

### 1. Preparar variables de entorno
Configura en Render:
- PORT (Render la inyecta automaticamente)
- IGDB_CLIENT_ID (opcional)
- IGDB_CLIENT_SECRET (opcional)
- HF_API_TOKEN (obligatorio para IA Lab)

### 2. Crear servicio Web
- Runtime: Node
- Build command: npm install
- Start command: npm start

### 3. Añadir disco persistente
- Mount path sugerido: /opt/render/project/src/data
- Esto evita perder store.db entre reinicios.

### 4. Verificar
- Abre la URL publica.
- Comprueba /api/games y la vista IA Lab.

## Opcion alternativa: Firebase
Firebase Hosting por si solo no ejecuta Express directamente. Para mantener Express, se debe:
- Usar Cloud Functions con Express embebido.
- Evitar SQLite local (filesystem efimero en serverless).
- Migrar a Firestore o Cloud SQL.

Por eso, para este stack actual, Render o Railway son opciones mas directas.

## Checklist de validacion post-deploy
- El catalogo carga en navegador.
- Login de admin demo funciona.
- CRUD de productos disponible para rol autorizado.
- IA Lab responde cuando HF_API_TOKEN esta configurado.
- Base de datos persiste tras reinicio del servicio.
