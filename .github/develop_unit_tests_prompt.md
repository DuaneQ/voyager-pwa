# Unit Tests Prompt (Jest + React Testing Library)

## Mock Initialization Order Note (2025-09-15)
When mocking modules (e.g., Firebase), always define mock variables (e.g., `const mockGetFunctions = jest.fn()`) before using them in `jest.mock` calls. Initializing mocks after the `jest.mock` call can cause ReferenceErrors and break test execution. This was observed in `useAIGeneration.test.tsx` and resolved by ensuring all mocks are defined before their usage in module mocks.

Purpose

This prompt instructs an agent or developer to produce Jest unit tests and React Testing Library component tests for the Voyager PWA codebase.

Policy: Do NOT change production code just to make tests pass

  IMPORTANT: Changing production code solely to make unit tests pass is strictly prohibited.
  Tests are the contract that verify product behavior; altering production code to satisfy a test
  without addressing the underlying cause masks real bugs and undermines confidence in the
  codebase. Follow the workflow below when tests are failing:

  - Preferred fixes:
    - Fix the test or its mocks. Tests should be updated when they are asserting incorrect
      behavior, rely on fragile implementation details, or use incomplete/misaligned mocks.
    - Improve test mocks to accurately represent real runtime shapes (for example, make
      firebase/functions mocks behave like the real SDK or use the documented per-RPC global
      handler pattern). Prefer fixing the test harness over changing production logic.

  - When a production change is truly required:
    1. Open an issue describing the failure, why a production change seems necessary, and the
       proposed fix. Include failing test output and a minimal reproduction if possible.
    2. Implement the fix in a feature branch and include a detailed PR body that documents
       why the change is required, the impact, and any backward-compatibility considerations.
    3. Add or update unit tests to explicitly cover the new/changed behavior.
    4. Obtain at least one maintainer or repo-owner approval (code review) before merging.
    5. If the change relaxes strict validation or alters user-facing behavior, coordinate a
       rollback/backout plan and notify stakeholders.

  - Small defensive adjustments allowed only with justification:
    - Minor defensive guards that make code tolerant of test harness differences (for example
      defensive handling of mock shapes) are acceptable if they are non-breaking, clearly
      documented in the PR, and accompanied by tests that assert the intended behavior.
    - Such changes must still follow the PR + review workflow above.

  - Rationale and enforcement:
    - This policy preserves the separation between production logic and test scaffolding.
    - If you see code changes in a PR that only exist to satisfy tests, request the author
      to either update tests/mocks or follow the required issue/PR workflow and obtain
      explicit approval.


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

- Firebase Functions: important testing pattern

  - We use a manual Jest mock for `firebase/functions` in `__mocks__/firebase-functions.js` (repo root). That mock expects tests to set per-RPC global handlers named `global.__mock_httpsCallable_<rpcName>`.
  - Example: to mock `createItinerary`, in your test set:
    `(global as any).__mock_httpsCallable_createItinerary = jest.fn().mockResolvedValue({ data: { success: true, data: { id: 'it-123' } } });`
  - If a test file uses `jest.mock('firebase/functions')` (recommended via `src/setupTests.ts`), add this small defensive shim in the test file to ensure the auto-mocked `httpsCallable` returns a callable function that consults those globals:

```ts
const { httpsCallable } = require('firebase/functions');
if (httpsCallable && typeof httpsCallable.mockImplementation === 'function') {
  httpsCallable.mockImplementation((functions: any, name: string) => {
    return async (payload: any) => {
      const handlerKey = `__mock_httpsCallable_${name}`;
      if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
        return (global as any)[handlerKey](payload);
      }
      if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
      return { data: { success: true, data: [] } };
    };
  });
}
```

  - Prefer the global handler pattern since it avoids jest hoisting pitfalls (ReferenceError) and makes tests easier to reason about.
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
