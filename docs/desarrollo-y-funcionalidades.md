# Desarrollo del proyecto y funcionalidades

## 1. Descripcion general

Este proyecto consiste en una tienda web academica de videojuegos orientada a ejecucion local. Su objetivo ha sido construir una aplicacion fullstack sencilla pero completa, capaz de demostrar conocimientos de interfaz, logica de negocio, persistencia de datos, integracion con APIs externas y uso aplicado de herramientas de IA.

La aplicacion permite consultar un catalogo de juegos, registrarse e iniciar sesion, gestionar un carrito, simular una compra, guardar favoritos, revisar el historial de pedidos y administrar productos y usuarios segun el rol asignado. Ademas, incorpora una seccion de IA para clasificar ideas de videojuegos mediante un modelo abierto de Hugging Face.

## 2. Como se ha realizado el proyecto

## 2.1 Enfoque de desarrollo

El proyecto se ha desarrollado como una demo academica fullstack con un criterio claro: priorizar una arquitectura comprensible, ejecutable en local y facil de defender tecnicamente. En lugar de utilizar un stack complejo con despliegue distribuido o herramientas de build avanzadas, se opto por una solucion directa que permitiera cubrir frontend, backend y base de datos dentro de un mismo entorno.

Se ha trabajado de forma iterativa. Primero se construyo una base funcional minima de tienda online, y posteriormente se fueron incorporando capas adicionales de funcionalidad: autenticacion, roles, panel de administracion, integracion con IGDB, historial de compras, favoritos, filtros y modulo de IA.

## 2.2 Arquitectura elegida

La arquitectura final es una arquitectura monolitica ligera para entorno local:

- Frontend estatico servido desde el mismo servidor.
- Backend REST con Express.
- Base de datos SQLite almacenada en archivo local.
- Integraciones externas puntuales con IGDB y Hugging Face.

Esta decision reduce la complejidad operativa, evita dependencias de servicios de despliegue y facilita la demostracion academica del flujo completo de la aplicacion.

## 2.3 Frontend

El frontend se ha desarrollado con React 18 cargado por CDN, sin Vite, Webpack ni proceso de compilacion previo. El archivo principal de la interfaz es public/app.js, que se renderiza desde public/index.html mediante Babel Standalone en el navegador.

Este enfoque se eligio por tres razones:

- Simplificar la puesta en marcha del proyecto.
- Evitar configuraciones adicionales para un entorno academico.
- Mantener toda la logica visible y accesible para revision.

En la parte cliente se implementan:

- Gestion de vistas mediante estado interno y History API.
- Consumo de la API REST con fetch.
- Persistencia local de usuario y carrito usando localStorage.
- Renderizado del catalogo, formularios, panel admin, favoritos, pedidos y modulo IA.
- Filtros, paginacion y control de estado de carga y errores.

## 2.4 Backend

El backend se ha desarrollado con Node.js y Express. Su funcion principal es servir el frontend estatico y exponer una API REST para la gestion de datos y funcionalidades del sistema.

Desde server/index.js se inicializa el servidor, se cargan variables de entorno, se activa el parseo JSON y se publican los archivos estaticos. A partir de ahi se gestionan los distintos endpoints de negocio.

Las responsabilidades del backend son:

- Consultar, crear, editar y eliminar juegos.
- Registrar e iniciar sesion de usuarios.
- Aplicar control de acceso por roles.
- Gestionar favoritos por usuario.
- Crear pedidos y recuperar historial de compras.
- Conectar con IGDB para busqueda de juegos.
- Conectar con Hugging Face para inferencia de clasificacion.

## 2.5 Base de datos

La persistencia se ha resuelto con SQLite, utilizando un archivo local en data/store.db. Esta decision encaja con el caracter academico del proyecto porque permite disponer de una base de datos real sin necesidad de instalar ni administrar un servidor externo.

La inicializacion y el seeding se realizan desde server/db.js. En ese archivo se crean las tablas necesarias y se insertan datos iniciales cuando hace falta.

Tablas principales del sistema:

- games: almacena el catalogo de videojuegos.
- users: guarda usuarios, contraseñas cifradas y roles.
- favorites: relacion entre usuario y juego favorito.
- orders: cabecera de pedidos realizados.
- order_items: detalle de productos incluidos en cada pedido.

## 2.6 Gestion de usuarios y roles

El sistema implementa autenticacion basica mediante email y password. Las contraseñas no se guardan en texto plano, sino con hash SHA-256.

Ademas, se ha incorporado un sistema de roles con tres niveles:

- user: usuario estandar.
- admin: puede gestionar productos y usuarios.

Este control de acceso permite simular reglas de negocio reales y diferenciar claramente capacidades dentro del sistema.

## 2.7 Integracion con APIs externas

El proyecto incluye dos integraciones externas relevantes:

### IGDB

Se utiliza IGDB como fuente de datos de videojuegos. La integracion permite:

- Buscar juegos externos desde el panel de administracion.
- Importar informacion de titulos reales al formulario de producto.
- Alimentar el catalogo inicial mediante seed automatizado.

Para ello se emplean variables de entorno con credenciales de cliente y un flujo de obtencion de token OAuth a traves de Twitch.

### Hugging Face

Se utiliza el modelo facebook/bart-large-mnli mediante la Inference API de Hugging Face. Esta integracion se ha añadido para cumplir el requisito academico de uso de IA dentro de una aplicacion real.

La funcionalidad recibe un texto libre y una lista de etiquetas, y devuelve una clasificacion con puntuaciones de afinidad. Esto se expone en la seccion Tu proximo juego.

## 2.8 Uso de IA durante el desarrollo

Durante el desarrollo se han utilizado prompts para acelerar la generacion de estructura, proponer mejoras y resolver integraciones concretas. Sin embargo, la incorporacion de IA no ha sido automatica ni ciega. Cada resultado ha sido revisado, adaptado y validado manualmente antes de integrarlo en el codigo final.

El uso de IA ha servido como apoyo en:

- Scaffolding inicial del proyecto.
- Propuesta de funcionalidades.
- Ajuste de arquitectura ligera.
- Integracion del modulo de clasificacion.
- Refinado de interfaz y experiencia de usuario.

## 2.9 Validacion y ajuste

El proyecto se ha ido validando de forma incremental mediante pruebas manuales en entorno local. En cada ampliacion funcional se ha comprobado:

- Que la interfaz mostrara correctamente los datos.
- Que la API devolviera respuestas coherentes.
- Que la base de datos almacenara la informacion esperada.
- Que los permisos por rol bloquearan acciones no autorizadas.
- Que las APIs externas fallaran de forma controlada cuando faltaban credenciales o habia errores de red.

Tambien se introdujo un catalogo de respaldo local para evitar que la aplicacion quedara inutilizable si fallaba el backend o la carga remota del catalogo.

## 3. Funcionalidades implementadas

## 3.1 Catalogo de juegos

La aplicacion muestra un catalogo de videojuegos con tarjetas visuales que incluyen:

- Imagen.
- Titulo.
- Precio.
- Genero.
- Acceso rapido a detalle.
- Accion para anadir al carrito.

El catalogo se alimenta desde la base de datos local y se puede consultar desde la ruta principal.

## 3.2 Busqueda, filtros y paginacion

El usuario puede localizar juegos mediante:

- Busqueda por texto.
- Filtro por genero.
- Filtro por plataforma.
- Rango de precio minimo y maximo.
- Navegacion paginada del catalogo.

Estas funciones mejoran la usabilidad y simulan el comportamiento de una tienda online real.

## 3.3 Vista de detalle

Cada juego dispone de una vista de detalle con informacion ampliada:

- Descripcion.
- Precio.
- Genero.
- Plataforma.
- Stock.

Desde esta vista el usuario puede anadir el producto al carrito o guardarlo como favorito.

## 3.4 Registro e inicio de sesion

La aplicacion permite:

- Crear una cuenta nueva.
- Iniciar sesion con usuario existente.
- Mantener la sesion en el navegador mediante almacenamiento local.

Existe ademas un usuario demo administrador para pruebas academicas.

## 3.5 Carrito de compra

El carrito permite:

- Agregar productos.
- Incrementar cantidades.
- Eliminar productos.
- Calcular el total automaticamente.
- Conservar temporalmente el contenido en localStorage.

## 3.6 Checkout simulado

El proceso de checkout recoge datos basicos del comprador y confirma una compra simulada. No existe pasarela de pago real, ya que el objetivo es academico y funcional, no comercial.

Al confirmar, el sistema genera un pedido y guarda sus lineas en la base de datos.

## 3.7 Panel de administracion

El sistema incorpora un panel de administracion accesible segun rol. Desde este panel se pueden realizar tareas de mantenimiento sobre el contenido y los usuarios.

### Gestion de productos

Permite:

- Crear nuevos juegos.
- Editar juegos existentes.
- Eliminar juegos.
- Rellenar productos manualmente o apoyarse en datos de IGDB.

### Gestion de usuarios

Disponible para administradores. Permite:

- Crear usuarios.
- Editar usuarios.
- Asignar rol user, manager o admin.

## 3.10 Sistema de roles y permisos

La plataforma diferencia operaciones segun el rol:

- user: puede navegar, comprar, usar favoritos y consultar pedidos.
- admin: ademas puede gestionar usuarios y productos.

Esto permite demostrar control de acceso y proteccion de operaciones sensibles en la API.

## 3.11 Integracion con IGDB

El proyecto incorpora dos usos principales de IGDB:

- Busqueda manual desde el panel admin para reutilizar datos reales de juegos.
- Seeding inicial del catalogo con hasta 20 juegos cuando la tabla esta vacia.

Si la obtencion remota falla, el sistema mantiene operativa la aplicacion gracias a un conjunto de datos locales de respaldo.

## 3.13 Modulo de IA: Tu proximo juego

La aplicacion incluye una seccion especifica orientada a IA. En ella el usuario puede escribir una idea o descripcion de videojuego y solicitar una clasificacion por etiquetas.

La funcionalidad:

- Envia el texto al backend.
- El backend consulta el modelo de Hugging Face.
- Se reciben etiquetas con puntuaciones.
- El frontend presenta el resultado en formato interpretable.

Esta funcionalidad aporta un elemento diferencial al proyecto y demuestra una integracion real de inferencia externa en una aplicacion web.

## 3.14 Recursos visuales y anuncios

El frontend incluye piezas graficas propias en formato SVG y un rail lateral de anuncios. Estas piezas refuerzan la identidad visual de la tienda y aportan una presentacion mas cercana a un producto real.

## 4. Estructura tecnica del proyecto

- public/: frontend estatico, hojas de estilo, recursos visuales y catalogo fallback.
- server/: servidor Express, acceso a base de datos y scripts de seed.
- data/: base de datos SQLite.
- docs/: documentacion de apoyo academico.

## 5. Valor tecnico del proyecto

Este proyecto no se limita a una maqueta visual. Reune varias competencias tecnicas dentro de una misma entrega:

- Desarrollo fullstack.
- Modelado de datos.
- Consumo de APIs externas.
- Gestion de estados en cliente.
- Persistencia de sesion y carrito.
- Control de permisos.
- Integracion aplicada de IA.
- Capacidad de documentacion y justificacion tecnica.

## 6. Limitaciones actuales

Aunque el proyecto cumple bien su finalidad academica, presenta limitaciones asumidas por diseno:

- La autenticacion no utiliza tokens ni sesiones seguras reales.
- El frontend no esta modularizado con un bundler moderno.
- El checkout es simulado y no integra pasarela de pago.
- SQLite es adecuado para local, pero no para escalado multiusuario real.
- La dependencia de APIs externas requiere credenciales y conexion.

## 7. Conclusion

La tienda web desarrollada constituye una solucion academica completa y coherente. Se ha realizado con una arquitectura simple pero funcional, priorizando claridad, trazabilidad y cobertura de funcionalidades relevantes. El resultado final demuestra la construccion de una aplicacion web fullstack con persistencia, gestion de usuarios, administracion, consumo de APIs, tolerancia a fallos e integracion de inteligencia artificial aplicada.

En conjunto, el proyecto muestra no solo el producto final, sino tambien una forma ordenada de construirlo, justificarlo tecnicamente y ampliarlo de manera progresiva.