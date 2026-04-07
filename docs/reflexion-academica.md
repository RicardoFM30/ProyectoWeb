# Reflexion sobre herramientas y aprendizaje

## Herramientas utilizadas
- Node.js + Express: API REST y entrega de frontend estatico.
- SQLite: persistencia ligera para entorno academico.
- React (CDN + Babel): interfaz sin pipeline de build.
- IGDB API: fuente de datos de videojuegos para catalogo.
- Hugging Face Inference API: clasificacion semantica mediante modelo abierto.

## Decisiones tecnicas clave
- Se eligio un stack simple para priorizar entendimiento de arquitectura completa.
- Se uso SQLite por facilidad de uso en local y bajo costo operativo.
- Se separo logica de datos y logica de rutas para facilitar evolucion.
- Se aplico control de roles para simular requerimientos de negocio.

## Prompts clave y resultados
- Los prompts ayudaron a acelerar el scaffolding inicial.
- Los mejores resultados llegaron cuando el prompt incluyo contexto de archivos y restricciones exactas.
- La calidad final dependio de validacion humana en codigo, seguridad y UX.

## Dificultades encontradas
- Gestion de estado en frontend creciendo en complejidad al sumar vistas.
- Sincronizacion entre seed de base de datos y datos validos en UI.
- Dependencia de variables de entorno para APIs externas (IGDB y Hugging Face).

## Aprendizajes
- La IA acelera la implementacion, pero no reemplaza pruebas y criterio tecnico.
- Documentar prompts mejora trazabilidad y defendibilidad academica.
- Integrar IA en una app real requiere manejo de errores, fallback y UX clara.

## Mejoras futuras
- Migrar frontend a Vite y dividir componentes.
- Implementar autenticacion real con tokens.
- Reemplazar SQLite por Postgres para despliegues multi-instancia.
- Sustituir video placeholder por video generado con IA propio del proyecto.
