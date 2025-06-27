import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AlertContext, AlertProvider } from '../../Context/AlertContext';

// Mock AlertPopup to avoid rendering actual UI
jest.mock('../../components/utilities/Alerts', () => (props: { open: any; severity: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; message: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }) => (
  <div data-testid="alert-popup">
    {props.open && <span>{props.severity}: {props.message}</span>}
  </div>
));

const TestComponent = () => {
  const { alert, showAlert, closeAlert } = React.useContext(AlertContext);
  return (
    <div>
      <button onClick={() => showAlert('success', 'Test message')}>Show</button>
      <button onClick={closeAlert}>Close</button>
      <span data-testid="alert-open">{alert.open ? 'open' : 'closed'}</span>
    </div>
  );
};

describe('AlertContext', () => {
  it('provides default alert state', () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    expect(screen.getByTestId('alert-open').textContent).toBe('closed');
  });

  it('shows alert with correct severity and message', () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    act(() => {
      screen.getByText('Show').click();
    });
    expect(screen.getByTestId('alert-open').textContent).toBe('open');
    expect(screen.getByTestId('alert-popup')).toHaveTextContent('success: Test message');
  });

  it('closes alert', () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );
    act(() => {
      screen.getByText('Show').click();
    });
    act(() => {
      screen.getByText('Close').click();
    });
    expect(screen.getByTestId('alert-open').textContent).toBe('closed');
  });
});