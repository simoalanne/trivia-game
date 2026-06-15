# Temporary Question Editor Planning

This file captures the current planning decisions for overhauling the manage-questions editor to reuse the gameplay-style wheel interaction without starting implementation yet.

## Goal

Keep the same CRUD capabilities as the current editor, but make the experience feel lighter and more game-like by:

- reusing the wheel interaction pattern from gameplay
- progressively revealing controls in sheets instead of showing every field at once
- keeping the wheel as the primary editing canvas
- preserving live draft state while moving between entries

The redesign should reduce cognitive load, not reduce functionality.

## Core UX Direction

The editor should feel like editing a playable trivia card, not filling out a long admin form.

Main interaction model:

- the wheel is the primary canvas
- each spoke/entry is clickable and opens an entry editor sheet
- the center is clickable and opens card-level settings
- the wheel updates live as edits happen
- save and reset actions live below the card
- a compact summary strip lives above the card

This keeps the default screen focused on the card itself instead of exposing every form control immediately.

## Wheel-Based Editing Model

The gameplay wheel pattern is the inspiration, but the CRUD editor becomes its own editing experience.

Planned behavior:

- clicking an existing entry opens its editor
- the entry editor can navigate to previous or next entries without closing
- the card-level center opens card settings
- form state lives in the top-level question editor, so edits naturally persist while navigating
- the wheel acts as a live preview of the current draft

### Add Entry Affordance

Adding entries should be integrated into the wheel rather than exposed as a detached action.

Preferred options:

- a dedicated `+` spoke on the wheel when entry count is below max
- optionally a center plus/setup affordance when the card is still incomplete or empty

The main idea is that creation should happen from the same visual system as editing.

## Summary Strip

A small summary area above the wheel should show information that is not already visually obvious from the wheel itself.

Examples:

- difficulty
- format
- tags
- entry count
- validation state
- missing/incomplete setup cues
- unsaved changes status

This summary should complement the wheel, not repeat entry text already visible on it.

## Entry Actions

Delete behavior:

- desktop can show a hover delete affordance on a spoke
- all devices must also support deletion from inside the entry editor

Navigation behavior:

- entry sheets should support previous/next navigation
- moving between entries should not discard edits
- this fits the gameplay-like flow better than closing and reopening the sheet repeatedly

## State Ownership

`QuestionCardEditor` should own the full draft state and overall interaction flow.

Responsibilities:

- current `QuestionCardInput` draft
- selected entry index
- whether entry editor or card settings is open
- save/reset/cancel flow
- previous/next entry navigation
- generic draft updates

This allows format-specific editors to receive full card context when needed.

Examples:

- `MultipleChoiceEditor` can edit the selected entry and also manage shared choices
- `OrderItemsEditor` can see which positions are already used
- `OpenEndedEditor` can handle accepted answers and `uiHint`

## File Structure Decisions

### Shared Reusable UI

`TriviaCard` is a reusable component, not a feature-specific component.

Planned shared files:

- `apps/frontend/src/components/TriviaCard.tsx`
- `apps/frontend/src/components/TriviaCard.module.css`

`Sheet` remains a reusable component under `components`.

### Manage Questions

The manage-questions editor should move away from the current monolithic form and into a flatter structure with one file per question format.

Planned structure:

- `apps/frontend/src/features/manage-questions/ManageQuestionEditorPage.tsx`
- `apps/frontend/src/features/manage-questions/QuestionCardEditor.tsx`
- `apps/frontend/src/features/manage-questions/QuestionCardSettings.tsx`
- `apps/frontend/src/features/manage-questions/MultipleChoiceEditor.tsx`
- `apps/frontend/src/features/manage-questions/TrueOrFalseEditor.tsx`
- `apps/frontend/src/features/manage-questions/OrderItemsEditor.tsx`
- `apps/frontend/src/features/manage-questions/OpenEndedEditor.tsx`
- `apps/frontend/src/features/manage-questions/questionCardDraft.ts`

This is intentionally flat:

- not a deep folder tree
- not many tiny abstraction files like `adapter`, `state`, or `types`
- not all format editors squeezed into one file

### Responsibility Split

`QuestionCardEditor.tsx`

- renders the wheel
- owns selection state
- opens entry editor or card settings
- coordinates summary and save/reset actions
- routes to the correct format editor

`QuestionCardSettings.tsx`

- edits global card-level fields
- should stay focused on truly global settings

Global settings likely include:

- prompt
- difficulty
- tags
- format

Format-specific global fields should stay with the format editor when that is more natural.

Examples:

- multiple choice `choices` can live in `MultipleChoiceEditor`
- open ended `uiHint` can live in `OpenEndedEditor`

Format editor files own their own rules and editing UI:

- `MultipleChoiceEditor.tsx`
- `TrueOrFalseEditor.tsx`
- `OrderItemsEditor.tsx`
- `OpenEndedEditor.tsx`

`questionCardDraft.ts`

- create empty card
- add/remove entry
- change format
- immutable draft update helpers

## Design Guardrails

- keep all current functionality
- reduce visual heaviness by progressive disclosure
- avoid turning card settings back into the old monolithic form
- prefer direct manipulation from the wheel over detached controls
- keep live preview behavior central to the experience
- keep format-specific complexity in the corresponding format file

## Migration Intent

The current monolithic `QuestionForm.tsx` is considered too heavy and should be replaced rather than expanded.

The overall direction is:

- move `TriviaCard` into reusable `components`
- build a stateful `QuestionCardEditor`
- split editing by question format into separate flat files
- keep the editor game-like and spatial
- preserve all existing CRUD capabilities through a lighter interaction model

## First Pass Scope

For the first implementation pass, the goal is to validate the core interaction model rather than ship every planned refinement.

Good enough for first pass:

- implement the new editor flow for one format only
- keep the wheel as the main canvas
- support center/card settings editing
- support entry sheet editing
- keep draft state in `QuestionCardEditor`
- update the wheel live as edits happen
- support save/reset

Things that can wait until later:

- support for all four formats
- hover delete polish
- plus/add-entry wheel affordances
- extra summary-strip refinements
- prev/next entry navigation if it slows down the first validation pass
- other easy-to-add polish features that are not required to judge the core UX

The main purpose of the first pass is to see whether the game-like editing model actually feels better in practice when implemented, before committing to the full migration.
