# Changelog

## folded-o-v1 — 2026-11-11

- Use the selected view's fold state for `o` when it differs from the saved state.
- Add a sibling below a folded block. Keep first-child insertion for expanded
  blocks with children.
- Keep `Shift+O` insertion above the selected block.
- Add 13 tests for block placement and focus. All 63 tests pass.
- Build `extension.js` from source with `npm run build`.

Based on upstream commit `e7b387d0814a8d08ddc56a32fa49ee6511f95a74`.
