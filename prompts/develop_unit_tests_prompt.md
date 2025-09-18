# Unit Tests Prompt (Jest + React Testing Library)

## Mock Initialization Order Note (2025-09-15)
When mocking modules (e.g., Firebase), always define mock variables (e.g., `const mockGetFunctions = jest.fn()`) before using them in `jest.mock` calls. Initializing mocks after the `jest.mock` call can cause ReferenceErrors and break test execution. This was observed in `useAIGeneration.test.tsx` and resolved by ensuring all mocks are defined before their usage in module mocks.

Purpose

This prompt instructs an agent or developer to produce Jest unit tests and React Testing Library component tests for the Voyager PWA codebase.

Requirements

- Produce clear, small, deterministic tests for utilities, hooks, and components.
- Avoid real network calls; mock Firebase, OpenAI, and external HTTP calls.
- Prefer using existing `__mocks__` where available.
- Include test plan, test code, and verification commands.

Agent Instructions

1. Identify target file(s) and list responsibilities to test (functions, side effects, outputs).
2. For each target produce:
   - A 1–2 sentence test plan (what to test and expected outcome).
   - 2–4 focused tests covering happy path and key edge cases.
   - Any mock implementations required (Firebase Auth/Firestore/functions, OpenAI, SerpApi/Google Places).
   - A note on test performance and determinism.
3. Provide commands to run the tests and sample expected output.

Reference files (fixtures & memory)

- Agent memory: `prompts/agent_memory.json` (read/write persistent metadata about runs and tasks)
- Fixtures (examples provided):
  - `tests/fixtures/openai/sample-completion.json`
  - `tests/fixtures/places/textsearch-cancun.json`
  - `tests/fixtures/serpapi/sample-flights.json`

Testing style

- Use `jest` + `@testing-library/react` and `@testing-library/jest-dom`.
- Use `msw` (Mock Service Worker) or `jest-fetch-mock` for HTTP stubs if needed.
- For hooks, use `@testing-library/react-hooks` or render a minimal component wrapper.

Mocking guidance

- Firebase: prefer `__mocks__/firebase.js` present in the repo. Mock Firestore `get`, `set`, and Auth `currentUser` behavior. Use dependency injection where helpful.
- OpenAI: mock the client to return deterministic completions. Provide small JSON responses that match expected prompt outputs.
- HTTP APIs: stub with `msw` or `fetch` mocks to return representative payloads for mapping functions.

Templates

Unit test template (utility):

```javascript
import { myUtil } from '../../src/utils/myUtil';

describe('myUtil', () => {
  it('returns default for empty input', () => {
    expect(myUtil(undefined)).toEqual({});
  });
});
```

Component test template (React Testing Library):

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../../src/components/MyComponent';

test('submits and shows success', async () => {
  render(<MyComponent />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

Hook test template (simple wrapper):

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import useMyHook from '../../src/hooks/useMyHook';

test('updates state on call', () => {
  const { result } = renderHook(() => useMyHook());
  act(() => { result.current.doSomething(); });
  expect(result.current.value).toBe('expected');
});
```

Verification commands

```bash
# Run unit tests
npm test -- --watchAll=false

# Run a single test file
npm test -- src/__tests__/path/to/testfile.test.ts
```

Deliverables

- New test files under `src/__tests__/` using repository conventions.
- Mock implementations in `__mocks__/` if required.
- A short PR body with the test plan, verification commands, and sample output.

Example agent request

"Write unit tests for `src/hooks/useAIGeneration.ts` covering success path and OpenAI failure; mock OpenAI client and functions config."
