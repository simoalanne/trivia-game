# Manage Questions Refactor

This note captures the current state of the manage-questions refactor and the
agreed direction before more code changes happen.

It is intentionally concrete. The goal is that we can both read this file later
and know:

- what has already changed
- what is temporary
- what data-model direction we are moving toward
- what order the bigger refactor should happen in

## Current State

The question bank list page is now wired to open a modal editor directly from
the list:

- `Create Trivia Card` opens a create modal
- the edit icon opens an edit modal
- row click no longer navigates anywhere

Files changed for that first pass:

- [src/features/manage-questions/ManageQuestionsListPage.tsx](/home/simo/Downloads/trivia-game/apps/frontend/src/features/manage-questions/ManageQuestionsListPage.tsx)
- [src/features/manage-questions/TriviaCardsTable.tsx](/home/simo/Downloads/trivia-game/apps/frontend/src/features/manage-questions/TriviaCardsTable.tsx)
- [src/features/manage-questions/QuestionCardModal.tsx](/home/simo/Downloads/trivia-game/apps/frontend/src/features/manage-questions/QuestionCardModal.tsx)

Important: this first-pass modal is working code, but it is not the desired
final implementation. It exposes the current contract complexity too directly
and ends up fighting TypeScript and repeated format branching.

## What Feels Wrong

The current CRUD contract models question variants with polymorphic answer
types. That looked logical at project start, but it leaks UI/editor distinctions
into the stored data model.

Examples of the current over-modeling:

- true/false stored as boolean instead of just a choice question
- order items stored as numeric answer positions instead of just choices
- open ended storing `string[]` accepted answers when current authoring mostly
  wants a single value
- country represented as a special answer shape concern when it is really a UI
  input concern

This makes the editor harder than it should be:

- repeated `switch (format)` logic
- union narrowing in many places
- more validation branches than the product really needs
- storage shape leaking into frontend form state

## Gameplay Is Already Closer To The Better Model

Backend gameplay state already sends something much closer to the simpler
canonical shape:

- `prompt`
- `entries: { text: string; answer: string | null }[]`
- `choices: string[] | null`
- one mode-like field that currently acts more like answer presentation than a
  true stored domain variant

That means gameplay is not the main migration problem. The CRUD contract is the
odd one out.

## New Direction

The new canonical model should be flatter and based on answer interaction mode,
not backend answer primitive type.

Current best direction:

- `answerMode: "TEXT" | "CHOICES" | "COUNTRY"`
- `choices` exists only for `CHOICES`
- `choicesAreUnique` exists only for `CHOICES`. this is needed so that for example order-item questions or whatever arbirary question where author wants that when someone submits an answer the backend gameplay state will remove that answer from the remaining choices for the next player
- stored entry answer is a string
- country is an input mode, not a different stored answer type

This makes several current formats redundant as data-shaping concepts:

- `OPEN_ENDED`
- `TRUE_OR_FALSE`
- `ORDER_ITEMS`

Those can become:

- creation templates
- optional metadata for filtering or analytics later
- runtime behavior flags only if truly needed

But they should not force different stored answer types unless that becomes a
real requirement later.

## Escape Hatch For Order Items

One real gameplay distinction may still matter: some choice sets should behave
as unique/consumable choices.

Example:

- order items may need to remove already-used answers from the remaining options

That does not justify a separate persisted answer primitive. If needed, keep a
small explicit rule instead, for example:

- `choicesAreUnique: boolean`

This is a gameplay/CRUD template concern, not a reason to reintroduce numeric
answer storage.

## Question Format

`questionFormat` does not need to stay a core domain concept if it is only
helpful during authoring.

Good default assumption:

- do not store `questionFormat` as a required domain field for now
- use templates in authoring instead
- add `questionFormat` back later only if it proves valuable for:
  - filtering
  - analytics
  - runtime behavior
  - explicit metadata consumers

If it comes back later, it should be because there is real need, not because the
initial editor happened to categorize questions that way.

## Refactor Order

The preferred larger refactor order is:

1. Update contracts and backend logic to the simpler canonical model.
2. Simplify gameplay/backend runtime mapping around that model.
3. Convert existing stored questions so runtime code can rely on the new shape.
4. Update question-bank list/table rendering to the new shape.
5. Delete dead routes/files/components early enough to reduce confusion.
6. Rebuild or substantially rewrite the question editor modal last.

Why this order:

- gameplay is already close to the better model
- CRUD editor is the most taxing surface
- rewriting the editor before the contract settles means paying twice

## Current Modal Status

The current `QuestionCardModal` should be treated as a temporary stopgap:

- it proves the modal workflow direction
- it should not be treated as the final authoring architecture
- it is likely better to rewrite it against the new contract than keep
  “cleaning” the current polymorphic version

Cleaning the modal without fixing the data model would improve readability but
would still leave us fighting the wrong abstraction.

## Non-Goals For The Next Step

These are not the first refactor target:

- polishing the current modal internals
- spreading the current modal logic into more files just to make the current
  abstraction look cleaner
- preserving old create/edit routes as the long-term direction

The next meaningful step is correcting the data model, not polishing the wrong
one.
