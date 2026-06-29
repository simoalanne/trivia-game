# Frontend Cleanup Notes

This file captures the current frontend direction so cleanup work has a stable
target. It is intentionally about the foundation, not new product features.

## Goal

Make the frontend harder to drift by reducing styling systems, wrapper
components, and feature boundaries that do not match the product.

The immediate cleanup should preserve current behavior unless a file is already
slated for replacement.

## Styling Direction

- Use daisyUI semantic classes for common primitives.
- Use Tailwind utilities for layout, spacing, responsive behavior, and local
  composition.
- Keep CSS modules only for custom visuals or behavior that daisyUI/Tailwind do
  not express cleanly, such as the trivia wheel.
- Do not create React wrappers whose only job is to rename daisyUI classes.
- Do create React components when they own accessibility structure, behavior,
  or a product concept.

Good default:

```tsx
<section className="grid gap-4 rounded-box border border-base-300 bg-base-100 p-4">
  <Field label="Prompt">
    <textarea className="textarea w-full" />
  </Field>
  <button className="btn btn-primary" type="submit">
    Save
  </button>
</section>
```

Avoid:

```tsx
<TextInput />
<Button variant="primary" />
```

unless the wrapper adds real behavior beyond mapping props to classes.

## globals.css

`globals.css` should be small and boring:

- Tailwind import.
- daisyUI plugin setup.
- one app theme.
- minimal browser/app defaults.

It should not define a second design-token system on top of daisyUI and
Tailwind. Prefer classes such as `bg-base-100`, `text-base-content/70`,
`border-base-300`, `rounded-box`, `btn`, `input`, and `alert` over local aliases
such as `--color-surface`, `--color-text-muted`, `--space-4`, or `--radius-lg`.

The daisyUI theme variables configure what semantic classes mean. JSX should
usually consume the semantic classes, not the raw variables.

daisyUI also has premade themes so if we dont need a custom theme then only
reason to use variables is for cases where we cant use semantic classes
to avoid those from using ad-hoc values.

## Reusable Concepts

Stable concepts worth keeping or improving:

- `Field`: label, control, description, and error structure.
- `CountryPicker`: searchable country combobox behavior.
- `TriviaCard`: player-facing wheel/card visual.
- A single modal/dialog primitive if modals become a stable workflow.
- A chip/radio group only if it becomes the shared option-selection pattern.

Weak abstractions to remove or avoid extending:

- `TextInput`: too thin if it only renders `input w-full`.
- `Button`: only keep if it gains behavior such as pending/loading or a real
  product intent.
- `SheetIconButton`: too specific to the current question editor sheet.
- CSS modules for ordinary buttons, cards, form rows, badges, and page layout.

## Product Slices

Stable product concepts:

- **Play**: create/join, session restore, lobby/waiting, active gameplay, ended
  game.
- **Question bank**: list, create, edit, delete, AI-generated draft review.
- **Shared visuals/controls**: trivia wheel, country picker, field structure.

Unstable concepts that should not receive polish:

- The current radial question editor as the primary authoring UI.
- Separate create/edit question pages if the future is a modal editor from the
  question bank.
- The current split between create/join, lobby, and active game routes if the
  future is one `/play` session route.

## Question Management Direction

Longer term, question management should be an AI-assisted content review
workflow:

1. User describes or imports content.
2. The system creates a structured question draft.
3. User reviews and corrects the draft in a clear form.
4. User saves it to the question bank.

Manual blank authoring should remain possible, but it is not the heroic path.
The form should optimize review and correction: clear sections, array fields,
chips for option choices, inline validation, and small targeted controls.

The wheel can remain the player-facing card interaction. In question management
it should be optional preview, not the primary editing mechanism.

## First Cleanup Pass

Recommended first slice:

1. Simplify `globals.css` to daisyUI theme plus minimal defaults.
2. Decide on one accessible primitive library, likely Base UI, and remove the
   other once replacements are done.
3. Replace ordinary CSS module styling with daisyUI/Tailwind when touching files.
4. Remove or inline wrappers that only rename daisyUI primitives.
5. Keep custom CSS around `TriviaCard` until the gameplay visual is deliberately
   redesigned.
6. Run `pnpm --filter frontend typecheck` after cleanup changes.

Done means the app has fewer ways to build the same primitive, not that every
future feature is designed.
