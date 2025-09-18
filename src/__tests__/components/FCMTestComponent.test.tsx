import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Top-level mock so dynamic import(...) inside the component resolves to this mock.
jest.mock('firebase/messaging', () => ({
  isSupported: jest.fn().mockResolvedValue(true),
  getMessaging: jest.fn().mockReturnValue({}),
  getToken: jest.fn().mockResolvedValue('test-token'),
}));

import FCMTestComponent from '../../components/FCMTestComponent';

describe('FCMTestComponent', () => {
  const originalNavigator = { ...navigator } as any;
  const originalNotification = (global as any).Notification;
  const originalPushManager = (global as any).PushManager;

  afterEach(() => {
    // restore globals
    Object.defineProperty(window, 'navigator', { value: originalNavigator, configurable: true });
    (global as any).Notification = originalNotification;
  (global as any).PushManager = originalPushManager;
  jest.restoreAllMocks();
  });

  test('shows unsupported message when APIs are missing', async () => {
    // remove serviceWorker and Notification
    const fakeNav = { ...originalNavigator };
    delete (fakeNav as any).serviceWorker;
    Object.defineProperty(window, 'navigator', { value: fakeNav, configurable: true });

    render(<FCMTestComponent />);

    expect(await screen.findByText(/Push notifications are not supported/i)).toBeInTheDocument();
  });

  test('renders enable button when supported and initializeMessaging requests permission', async () => {
    // ensure serviceWorker exists
    const fakeNav = { ...originalNavigator, serviceWorker: {} };
    Object.defineProperty(window, 'navigator', { value: fakeNav, configurable: true });

    // Mock Notification API
    const mockRequest = jest.fn().mockResolvedValue('granted');
    (global as any).Notification = { requestPermission: mockRequest };
  // Mock PushManager presence
  (global as any).PushManager = {};

    render(<FCMTestComponent />);

    // Enable button should appear
    expect(await screen.findByText(/Enable Push Notifications/i)).toBeInTheDocument();

    // click enable and await permission flow
    fireEvent.click(screen.getByText(/Enable Push Notifications/i));

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalled();
    });
  });
});
