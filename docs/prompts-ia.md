# Documentacion de prompts IA

Este documento registra prompts usados durante el desarrollo y su impacto en el proyecto.

## Prompt 1: Generacion de estructura inicial
- Objetivo: Crear una tienda web academica con frontend React sin build y backend Express + SQLite.
- Prompt: "Genera una demo de tienda de videojuegos con catalogo, auth, carrito y panel admin usando React CDN + Express + SQLite".
- Contribucion:
  - Definio la arquitectura fullstack simple para ejecucion local rapida.
  - Permitio una base funcional para iterar requisitos academicos.

## Prompt 2: Mejora de permisos por roles
- Objetivo: Incorporar control de acceso por usuario, encargado y admin.
- Prompt: "Agrega roles user, manager, admin y protege endpoints por rol".
- Contribucion:
  - Se habilitaron permisos diferenciados para gestion de productos y usuarios.
  - Se alineo el proyecto con criterios de software aplicado a escenarios reales.

## Prompt 3: Integracion IGDB
- Objetivo: Importar datos reales de videojuegos y enriquecer catalogo.
- Prompt: "Conecta IGDB para buscar juegos e importar datos al panel admin".
- Contribucion:
  - Aporto contenido dinamico y realista para pruebas funcionales.
  - Introdujo gestion de variables de entorno y consumo de APIs externas.

## Prompt 4: Integracion Hugging Face
- Objetivo: Cumplir requisito de inferencia con modelos abiertos.
- Prompt: "Implementa un endpoint que use facebook/bart-large-mnli para clasificar descripciones de juegos".
- Contribucion:
  - Se agrego endpoint /api/ai/classify y vista IA Lab para pruebas desde navegador.
  - Se incorporo una capacidad de IA explicable y evaluable dentro de la web.

## Prompt 5: Identidad visual neon arcade
- Objetivo: Crear una identidad visual propia y coherente.
- Prompt: "Disena estilos neon-futuristas con contraste alto, cards y paneles consistentes".
- Contribucion:
  - Se establecio lenguaje visual diferenciado (neon, magenta, paneles oscuros, tipografia arcade).
  - Mejoro percepcion de producto y cohesion entre secciones.

## Nota metodologica
- Los prompts no sustituyen criterios tecnicos.
- Cada salida fue revisada, ajustada y validada manualmente antes de integrarse.
