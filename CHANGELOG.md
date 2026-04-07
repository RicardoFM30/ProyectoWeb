# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-18
### Added
- Initial demo with catalog, auth, cart, checkout, and admin CRUD.
- Express API with SQLite storage.

## [0.2.0] - 2026-03-18
### Added
- IGDB search endpoint to fetch game data and cover images.
- Admin helper to import IGDB data into the product form.
- Environment variable support for IGDB credentials.
- Changelog file for tracking changes.

## [0.2.1] - 2026-03-18
### Fixed
- Validate and sanitize product data to avoid empty entries.
- Prevent catalog rendering issues from invalid prices.

## [0.2.2] - 2026-03-18
### Fixed
- Accept comma decimal prices in admin form and API.

## [0.2.3] - 2026-03-18
### Fixed
- Preserve JSON headers on admin requests so product saves reach the API.

## [0.2.4] - 2026-03-18
### Fixed
- Normalize IGDB cover URLs to ensure images load after import.

## [0.3.0] - 2026-03-18
### Added
- IGDB seed script to load 20 games with images.
- Automatic IGDB seeding when the games table is empty.
### Changed
- Remove games without images during seeding.

## [0.4.0] - 2026-03-18
### Added
- Role system with user, manager, and admin permissions.
- Admin user management for creating and editing users.
### Changed
- Admin panel layout upgraded with tabs and inventory view.

## [0.6.0] - 2026-04-07
### Added
- Hugging Face inference endpoint `/api/ai/classify` using `facebook/bart-large-mnli`.
- New `IA Lab` section in frontend to test text classification.
- Academic documentation under `docs/` (prompts, reflection, cloud deployment).
- AI media block integrated in IA Lab (image + replaceable video slot).

## [0.5.0] - 2026-03-18
### Added
- Favorites per user.
- Orders history with simulated checkout.
- Catalog filters and pagination.


