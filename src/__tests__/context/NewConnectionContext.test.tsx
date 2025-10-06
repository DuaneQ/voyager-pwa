import React from 'react';
import { render } from '@testing-library/react';
import { NewConnectionProvider, useNewConnection } from '../../Context/NewConnectionContext';

function ConsumerComponent() {
  const { hasNewConnection, setHasNewConnection } = useNewConnection();
  return (
    <div>
      <span data-testid="status">{hasNewConnection ? 'yes' : 'no'}</span>
      <button onClick={() => setHasNewConnection(true)}>set</button>
    </div>
  );
}

describe('NewConnectionContext', () => {
  it('throws when used outside provider', () => {
    expect(() => render(<ConsumerComponent />)).toThrow('useNewConnection must be used within a NewConnectionProvider');
  });

  it('provides state and setter inside provider', () => {
    const { getByTestId, getByText } = render(
      <NewConnectionProvider>
        <ConsumerComponent />
      </NewConnectionProvider>
    );

  expect(getByTestId('status').textContent).toBe('no');
  // Use fireEvent to trigger the click and wait for state update
  const { fireEvent, waitFor } = require('@testing-library/react');
  fireEvent.click(getByText('set'));
  return waitFor(() => expect(getByTestId('status').textContent).toBe('yes'));
  });
});
