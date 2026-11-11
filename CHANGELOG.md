# Changelog

## folded-o-v2 — 2026-11-11

- Set `m` to click hint 5, and keep `b` for hint 6.
- Keep `f` for visible link hints.
- Set `c` to copy the selected block reference in normal and visual modes.
- Add `Alt+W` (Option+W on macOS) to close the current sidebar page in all modes.
- Update hint labels, the help panel, and the import instructions.
- Keep the folded-block insertion fix from `folded-o-v1`.

## folded-o-v1 — 2026-11-11

- Use the selected view's fold state for `o` when it differs from the saved state.
- Add a sibling below a folded block. Keep first-child insertion for expanded
  blocks with children.
- Keep `Shift+O` insertion above the selected block.
- Add 13 tests for block placement and focus. All 63 tests pass.
- Build `extension.js` from source with `npm run build`.

Based on upstream commit `e7b387d0814a8d08ddc56a32fa49ee6511f95a74`.
