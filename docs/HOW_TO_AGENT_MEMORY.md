## HOW TO: Use agentMemory, templates, prompts, and fixtures to create features or fix bugs

Purpose
-------
This document explains, in simple steps, how to use the project's on-disk agent memory (`prompts/agent_memory.json`), the prompt templates (`prompts/*.md`), the helper `tools/agentMemory.js`, and the `tests/fixtures/` files when you want to create a new feature, update an existing feature, or fix a bug.

Audience
--------
Beginners who know basic Git and Node.js commands and want a reproducible way to track work, run tests, and keep an audit trail for agent-assisted development.

Quick overview (one-liner)
---------------------------
Edit or append a task to `prompts/agent_memory.json` (manually or via `tools/agentMemory.js`), implement code, add tests using fixtures, run tests, and record results; the repo keeps small snapshot notes under `prompts/agent_memory_commits/` when using the commit helper.

Files you need to know
----------------------
- `prompts/agent_memory.json` — persistent on-disk memory of last runs and open tasks.
- `prompts/*.md` — agent templates and instruction prompts used by automated agents or humans as checklists.
- `tools/agentMemory.js` — helper with functions: `readMemory()`, `writeMemory()`, `get()`, `set()`, `appendTask()`, and `commitAfterWrite()`.
- `tests/fixtures/` — deterministic JSON payloads you can reuse in unit tests and Cypress tests.

Contract (what we exchange)
---------------------------
- Input: a task object with at least title and description. Example:

```json
{
  "title": "Add hotel search UI hook",
  "description": "Create `useHotelSearch` hook and unit tests using fixtures/places/*.json",
  "owner": "@your-username",
  "priority": "P2"
}
```

- Output: updated `prompts/agent_memory.json` with the new task in `openTasks`, a small snapshot note under `prompts/agent_memory_commits/`, and tests passing locally.

Step-by-step: Create a new feature card (manual)
----------------------------------------------
1. Open `prompts/agent_memory.json` in your editor.
2. Find the `openTasks` array (create it if missing).
3. Add a new object with `title`, `description`, `owner`, and optional `priority` and `createdAt`.

Example (manual edit):

```json
"openTasks": [
  {
    "title": "Add hotel search UI hook",
    "description": "Create `useHotelSearch` hook and unit tests using fixtures/places/textsearch-cancun.json",
    "owner": "@you",
    "priority": "P2",
    "createdAt": "2025-09-12T12:00:00.000Z"
  }
]
```

Step-by-step: Create a new feature card (using the helper)
--------------------------------------------------------
You can call the helper directly from node to append a task. From the repo root run:

```zsh
node -e "require('./tools/agentMemory').appendTask({title:'Add hotel search UI hook',description:'Create useHotelSearch hook and unit tests using fixtures/places/textsearch-cancun.json',owner:'@you',createdAt:new Date().toISOString()})"
```

Notes:
- `appendTask` updates `prompts/agent_memory.json` and saves the file.
- If you want a recorded snapshot and local git commit attempt, call the commit helper (see below).

Step-by-step: Implement the feature
-----------------------------------
1. Create or update source files under `src/` following the project's conventions.
2. Add unit tests under `src/` or `tests/` (Jest + React Testing Library is used in this repo).
3. When useful, use fixtures from `tests/fixtures/` to keep tests deterministic. Example: import `tests/fixtures/places/textsearch-cancun.json` and mock the Places response in your test.

Example Jest test pattern (pseudo):

```js
// ...existing setup...
import placesTextSearch from '../../tests/fixtures/places/textsearch-cancun.json';
test('search results show hotels', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => placesTextSearch }));
  // render component / call hook and assert
});
```

Step-by-step: Run tests locally
------------------------------
Run the project's test script. From the repo root:

```zsh
npm test
```

Or run a single Jest file for faster feedback:

```zsh
npx jest path/to/your.test.js
```

Step-by-step: Record progress and create a snapshot note
------------------------------------------------------
After you append or modify memory, you can create a small snapshot markdown note under `prompts/agent_memory_commits/` and attempt a git commit using the helper:

```zsh
node -e "require('./tools/agentMemory').commitAfterWrite('Added hotel search UI task and initial tests')"
```

What this does:
- Writes a timestamped markdown file under `prompts/agent_memory_commits/` with the current `agent_memory.json` snapshot and your summary.
- Attempts to `git add` and `git commit` the note (it will gracefully ignore failures if your environment doesn't allow commits).

How to use prompt templates (`prompts/*.md`)
------------------------------------------
1. Open the relevant prompt file: `prompts/develop_unit_tests_prompt.md` or `prompts/develop_ui_automation_prompt.md`.
2. Use it as a checklist when writing tests. The prompts explain expected request/response shapes, where fixtures live, and style guidance.
3. If you run an automated agent, provide the prompt file content to the agent as instructions (the repo uses these files to instruct agents).

How to use fixtures
-------------------
- Fixtures live under `tests/fixtures/` as small JSON payloads. Reuse them in tests instead of calling external APIs.
- Example fixture paths:
  - `tests/fixtures/places/textsearch-cancun.json`
  - `tests/fixtures/openai/sample-completion.json`
  - `tests/fixtures/serpapi/sample-flights.json`

Tips for test mocking
---------------------
- Mock `fetch` or network clients to return fixture JSON.
- Keep fixtures focused and small — update them when API shapes change and note the change in `prompts/agent_memory.json`.

Common workflows (cheat sheet)
------------------------------
- Create feature -> Implement -> Add tests -> Run tests -> Append result to memory -> Snapshot commit.

Commands (cheat sheet)
---------------------
Edit memory manually (editor)

```zsh
# open file in VS Code
code prompts/agent_memory.json
```

Append task via helper

```zsh
node -e "require('./tools/agentMemory').appendTask({title:'Add X',description:'...',owner:'@you',createdAt:new Date().toISOString()})"
```

Snapshot and attempt local commit

```zsh
node -e "require('./tools/agentMemory').commitAfterWrite('summary of work')"
```

Run unit tests

```zsh
npm test
```

Notes about automation and safety
--------------------------------
- Appending tasks is manual by default (either edit the JSON or call `appendTask`). This is intentional to keep a clear audit trail.
- If you want automation, two safe options are:
  - Add a small CLI script `scripts/create-feature-task.js` that prompts for fields and calls `appendTask` (I can add this for you).
  - Have `writeMemory` call `commitAfterWrite` automatically (less safe without review).

Best practices
--------------
- Keep tasks small and focused (one change per task).
- Use fixtures to avoid network flakiness in tests.
- When a fixture or API shape changes, update `prompts/agent_memory.json` with a note describing the change and why.
- Keep commit summaries short but descriptive.

If you want me to add an interactive CLI to create feature tasks or to wire automatic commits, tell me which option you prefer and I'll implement it.

Where to get help
-----------------
- Open a new issue or add a task to `prompts/agent_memory.json` with owner `@maintainer` and description asking for help.

Done
----
This file lives at `docs/HOW_TO_AGENT_MEMORY.md`. Follow the steps above to create, implement, test, and record feature work using the project's agent memory and tooling.
