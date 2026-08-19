---
name: fueltrail-ui
description: Applies the FuelTrail brand kit and Taste Skill to UI work across marketing, login, driver, manager, and admin. Use when changing layout, color, type, logos, or any frontend visual.
---

# FuelTrail UI

## Before any visual change

1. Read `docs/brand/style-guide.md`.
2. Look at `docs/brand/fueltrail-style-guide.png`.
3. Follow [Taste Skill](https://github.com/Leonxlnx/taste-skill) with the design read and dials in that doc.

## Tokens in code

Use Tailwind theme colors from `src/app/globals.css`: `ink`, `route`, `warm`, `steel`, `muted`, `success`, `alert`. Brand copy lives in `src/config/brand.ts`. Logo lives in `src/components/brand-lockup.tsx`.

## Do not

- Invent a second accent, swap Inter for Geist, or restore amber.
- Center every hero. Marketing/login use the kit’s split navy panel.
- Add cinematic motion. Drivers use this in a truck cab.
- Mix icon libraries. Phosphor only, stroke 1.5.
