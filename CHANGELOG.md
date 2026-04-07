# Historial de cambios

Todos los cambios importantes de este proyecto se documentan en este archivo.

## [0.7.0] - 2026-04-08
### Cambiado
- El alcance del proyecto se simplifico para ejecucion solo local (Express + SQLite + frontend estatico).
- La base de API del frontend se restablecio a endpoints locales.
- El arranque del servidor se simplifico a una unica ruta de ejecucion local.
### Eliminado
- Archivos y scripts de integracion con Firebase.
- Archivos de despliegue de Render y configuraciones especificas de nube.
- Documento de despliegue cloud.

## [0.6.4] - 2026-04-08
### Anadido
- Archivo de respaldo local del catalogo en `public/fallback-games.json`.
### Corregido
- El catalogo ahora carga datos de respaldo cuando `/api/games` no responde, evitando errores `Failed to fetch` en intentos de hosting sin backend.

## [0.6.3] - 2026-04-08
### Anadido
- Configuracion de base API en tiempo de ejecucion mediante `public/config.js` para URL externa de backend.
- Configuracion de CORS y variables de entorno para intentos de despliegue hibrido frontend/backend.
- Archivo blueprint de Render para aprovisionamiento del servicio.
### Cambiado
- Logica de ruta de base de datos adaptada a directorios externos escribibles durante pruebas de despliegue.

## [0.6.2] - 2026-04-07
### Anadido
- Rail lateral de anuncios con creatividades SVG originales.
- Etiquetas por defecto ampliadas para clasificacion IA.
### Cambiado
- Titulo de seccion y CTA actualizados de `IA Lab` a `Tu proximo juego` en navegacion.
- Tipografia y layout visual ajustados para mayor consistencia entre navegadores.
### Eliminado
- Bloques de anuncios inferiores y boton extra de creacion de concepto tras simplificacion de UX.

## [0.6.1] - 2026-04-07
### Anadido
- Endpoint de inferencia de Hugging Face `/api/ai/classify` con `facebook/bart-large-mnli`.
- Seccion IA en frontend para flujos de clasificacion de texto.
- Documentacion academica en `docs/` (prompts y reflexion).
### Corregido
- Migracion del endpoint de Hugging Face a Inference Router para resolver deprecaciones.
- Mejora de timeout y parseo defensivo para formatos de respuesta heterogeneos de HF.
- Mensajes de error de API mas claros para fallos de token/configuracion/red.

## [0.6.0] - 2026-04-07
### Anadido
- Bloque de media IA integrado en la seccion IA (imagen + espacio reemplazable para video).

## [0.5.0] - 2026-03-18
### Anadido
- Favoritos por usuario.
- Historial de pedidos con checkout simulado.
- Filtros y paginacion de catalogo.

## [0.4.0] - 2026-03-18
### Anadido
- Sistema de roles con permisos para user, manager y admin.
- Gestion de usuarios desde panel admin para crear y editar.
### Cambiado
- Layout del panel admin mejorado con tabs y vista de inventario.

## [0.3.0] - 2026-03-18
### Anadido
- Script de seed IGDB para cargar 20 juegos con imagen.
- Siembra automatica de IGDB cuando la tabla de juegos esta vacia.
### Cambiado
- Eliminacion de juegos sin imagen durante el seeding.

## [0.2.4] - 2026-03-18
### Corregido
- Normalizacion de URLs de portada de IGDB para asegurar carga de imagenes tras la importacion.

## [0.2.3] - 2026-03-18
### Corregido
- Conservacion de cabeceras JSON en solicitudes admin para que los guardados lleguen a la API.

## [0.2.2] - 2026-03-18
### Corregido
- Soporte de precios con coma decimal en formulario admin y API.

## [0.2.1] - 2026-03-18
### Corregido
- Validacion y saneamiento de datos de productos para evitar entradas vacias.
- Prevencion de errores de renderizado de catalogo por precios invalidos.

## [0.2.0] - 2026-03-18
### Anadido
- Endpoint de busqueda en IGDB para obtener datos de juegos e imagenes de portada.
- Ayudante admin para importar datos de IGDB al formulario de producto.
- Soporte de variables de entorno para credenciales IGDB.
- Archivo de historial de cambios para seguimiento.

## [0.1.0] - 2026-03-18
### Anadido
- Demo inicial con catalogo, auth, carrito, checkout y CRUD admin.
- API Express con almacenamiento SQLite.

## Bitacora paso a paso de la sesion (2026-04-07 a 2026-04-08)
1. Se completo el analisis base de estructura del proyecto, requisitos de arranque local y dependencias faltantes.
2. Los requisitos academicos se tradujeron a tareas de codigo y documentacion.
3. Se integraron endpoint de IA y flujo frontend de IA.
4. Se depuraron errores de ejecucion de Hugging Face en token, endpoint, timeout y formato de payload.
5. Se actualizo branding UI y seccion IA a `Tu proximo juego` con etiquetas ampliadas.
6. Se agregaron recursos promocionales SVG originales e integracion en rail lateral del catalogo.
7. Se intento ruta de despliegue cloud con Firebase Hosting y estrategia hibrida de backend.
8. Por limitaciones de plataforma y permisos, se introdujo estrategia de catalogo de respaldo.
9. Se decidio pausar despliegue cloud y volver a arquitectura solo local.
10. Se eliminaron archivos y dependencias cloud, conservando funcionalidades locales.


