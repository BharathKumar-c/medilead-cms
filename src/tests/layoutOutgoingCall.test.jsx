import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';
import { LicenseProvider } from '../context/LicenseContext';
import { ThemeProvider } from '../context/ThemeContext';

// Mock useSocket to avoid real socket connections
vi.mock('../hooks/useSocket', () => ({
  useSocket: vi.fn(() => {}),
  playNotificationSound: vi.fn(),
  playRingtoneLoop: vi.fn(() => vi.fn()), // returns a stop function
}));

// Mock window.matchMedia for ThemeContext
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock api
vi.mock('../services/api', () => ({
  default: {
    getToken: vi.fn(() => 'mock-token'),
    logout: vi.fn(),
    getMaintenanceMode: vi.fn().mockResolvedValue({ data: { enabled: false } }),
    getNotifications: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    getProfile: vi.fn().mockResolvedValue({ data: { user: { id: 1, name: 'Test User', role: 'telecaller', roles: ['telecaller'] } } }),
    getSettings: vi.fn().mockResolvedValue({ data: { settings: {} } }),
    vacClick2Call: vi.fn().mockResolvedValue({ status: 'success', data: { call_id: 'api-call-123' } }),
    vacHangup: vi.fn().mockResolvedValue({ status: 'success' }),
    updateCallStatus: vi.fn().mockResolvedValue({}),
    onUnauthorized: vi.fn(),
    onServiceUnavailable: vi.fn(),
    onEnvConfigError: vi.fn(),
  },
}));

// Mock AuthContext to return a logged-in user
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: 1, name: 'Test User', role: 'telecaller', roles: ['telecaller'] },
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    })),
  };
});

// Mock LicenseContext
vi.mock('../context/LicenseContext', async () => {
  const actual = await vi.importActual('../context/LicenseContext');
  return {
    ...actual,
    useLicense: vi.fn(() => ({ licenseExpired: false })),
  };
});

const renderLayout = () =>
  render(
    <BrowserRouter>
      <ThemeProvider>
        <LicenseProvider>
          <AuthProvider>
            <Layout title="Test">
              <div>Child content</div>
            </Layout>
          </AuthProvider>
        </LicenseProvider>
      </ThemeProvider>
    </BrowserRouter>
  );

describe('Layout — outgoing call popup', () => {
  let eventSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    eventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    eventSpy.mockRestore();
  });

  test('shows CallPopup in ready state when outgoing-call-pending event is dispatched', async () => {
    renderLayout();

    // Initially, no call popup should be visible
    expect(screen.queryByText('Call')).not.toBeInTheDocument();

    // Dispatch the outgoing-call-pending event
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '9876543210',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    // The call popup should now be visible with the phone number and a green "Call" button
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getByText('Ready to call')).toBeInTheDocument();
    expect(screen.getByText('Call')).toBeInTheDocument();
  });

  test('shows lead info in popup when leadData is provided', async () => {
    renderLayout();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '9876543210',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: {
              id: 5,
              name: 'John Doe',
              uhid: 'UHID-12345',
              phone: '9876543210',
            },
          },
        })
      );
    });

    // Lead info should be displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('UHID: UHID-12345')).toBeInTheDocument();
  });

  test('Cancel button dismisses popup without calling API', async () => {
    const { default: api } = await import('../services/api');
    renderLayout();

    // Dispatch outgoing call event
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '9876543210',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    // Popup should be visible
    expect(screen.getByText('9876543210')).toBeInTheDocument();

    // Click Cancel button
    await act(async () => {
      const cancelBtn = screen.getByText('Cancel').closest('button');
      cancelBtn.click();
    });

    // handleDismiss has a 250ms delay before calling onClose — wait for it
    await waitFor(() => {
      expect(screen.queryByText('9876543210')).not.toBeInTheDocument();
    });

    // vacClick2Call should NOT have been called (popup dismissed before calling)
    expect(api.vacClick2Call).not.toHaveBeenCalled();
  });

  test('Call button triggers vacClick2Call and transitions to ringing', async () => {
    const { default: api } = await import('../services/api');
    renderLayout();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '9876543210',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    // Click the green Call button
    await act(async () => {
      const callButton = screen.getByText('Call').closest('button');
      callButton.click();
    });

    // vacClick2Call should have been called with the phone number
    await waitFor(() => {
      expect(api.vacClick2Call).toHaveBeenCalledWith('9876543210');
    });

    // Should transition to ringing state (shows "Calling..." in status + button)
    await waitFor(() => {
      expect(screen.getAllByText('Calling...').length).toBeGreaterThanOrEqual(1);
    });
  });

  test('Call button shows loading spinner while API call is in progress', async () => {
    const { default: api } = await import('../services/api');
    // Make the API call hang to test loading state
    let resolveCall;
    api.vacClick2Call.mockImplementation(() => new Promise(resolve => { resolveCall = resolve; }));

    renderLayout();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '9876543210',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    // Click the green Call button
    await act(async () => {
      const callButton = screen.getByText('Call').closest('button');
      callButton.click();
    });

    // Should show "Calling..." with spinner (not "Ready to call" anymore)
    await act(async () => {
      expect(screen.getByText('Calling...')).toBeInTheDocument();
    });

    // Resolve the API call
    await act(async () => {
      resolveCall({ status: 'success', data: { call_id: 'api-call-123' } });
    });
  });

  test('does not show popup when no outgoing-call-pending event is dispatched', () => {
    renderLayout();

    // No popup should be visible without the event
    expect(screen.queryByText('Ready to call')).not.toBeInTheDocument();
    expect(screen.queryByText('Reject')).not.toBeInTheDocument();
  });

  test('second outgoing call replaces the first popup', async () => {
    renderLayout();

    // First call
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '1111111111',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    expect(screen.getByText('1111111111')).toBeInTheDocument();

    // Second call replaces the first
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('outgoing-call-pending', {
          detail: {
            call: {
              caller_number: '2222222222',
              direction: 'outbound',
              status: 'pending',
              intercom_number: '1001',
            },
            leadInfo: null,
          },
        })
      );
    });

    // Second number should be visible
    expect(screen.getByText('2222222222')).toBeInTheDocument();
  });
});
