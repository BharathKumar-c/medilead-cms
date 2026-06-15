'use strict';

import { describe, test, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';

beforeEach(() => {
  vi.clearAllMocks();
  import.meta.env.VITE_API_URL = '/api';
});

// ─────────────────────────────────────────────────────────────────────────────
//  vacClick2Call — Routed through backend proxy
// ─────────────────────────────────────────────────────────────────────────────
describe('api.vacClick2Call', () => {
  test('sends POST to /calls/vac/click2call with phone_number', async () => {
    const mockResponse = {
      status: 'success',
      data: { call_id: 1, code: 'C0001', phone_number: '9876543210' },
    };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    const result = await api.vacClick2Call('9876543210');

    expect(requestSpy).toHaveBeenCalledWith('/calls/vac/click2call', {
      method: 'POST',
      body: { phone_number: '9876543210' },
    });
    expect(result).toEqual(mockResponse);
  });

  test('does NOT require agentId parameter', async () => {
    const mockResponse = { status: 'success', data: { call_id: 1 } };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    // No agentId argument — backend resolves it from the authenticated user
    await api.vacClick2Call('9876543210');

    const body = requestSpy.mock.calls[0][1].body;
    expect(body).toEqual({ phone_number: '9876543210' });
    expect(body.agent_id).toBeUndefined();
  });

  test('passes through backend errors', async () => {
    const error = new Error('No VAC Agent ID configured');
    error.code = 'VAC_AGENT_NOT_SET';
    error.status = 400;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacClick2Call('9876543210')).rejects.toThrow('No VAC Agent ID configured');
  });

  test('passes through VAC_NOT_CONFIGURED errors from backend', async () => {
    const error = new Error('VAC Dialer integration is not configured');
    error.code = 'VAC_NOT_CONFIGURED';
    error.status = 503;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacClick2Call('9876543210')).rejects.toThrow('VAC Dialer integration is not configured');
  });

  test('passes through VAC_AGENT_NOT_LOGGED_IN errors from backend', async () => {
    const error = new Error('Agent is not logged into the VAC Dialer');
    error.code = 'VAC_AGENT_NOT_LOGGED_IN';
    error.status = 409;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacClick2Call('9876543210')).rejects.toThrow('Agent is not logged into the VAC Dialer');
  });

  test('passes through VAC_DIAL_FAILED errors from backend', async () => {
    const error = new Error('Click2Call failed');
    error.code = 'VAC_DIAL_FAILED';
    error.status = 502;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacClick2Call('9876543210')).rejects.toThrow('Click2Call failed');
  });

  test('returns success with backend response data', async () => {
    const mockResponse = {
      status: 'success',
      message: 'Call initiated successfully',
      data: {
        call_id: 42,
        code: 'C00000042',
        phone_number: '9876543210',
        direction: 'outbound',
        call_status: 'initiated',
        vac_message: 'Call initiated',
      },
    };
    vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    const result = await api.vacClick2Call('9876543210');

    expect(result.status).toBe('success');
    expect(result.data.call_id).toBe(42);
    expect(result.data.vac_message).toBe('Call initiated');
  });

  test('validation error when phone_number is missing', async () => {
    const error = new Error('Phone number is required');
    error.code = 'VALIDATION_ERROR';
    error.status = 400;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacClick2Call('')).rejects.toThrow('Phone number is required');
  });

  test('does NOT use VITE_VAC_SERVER_URL (routed through backend)', async () => {
    const mockResponse = { status: 'success', data: {} };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    await api.vacClick2Call('9876543210');

    // The request should go through api.request (backend proxy), not direct fetch
    expect(requestSpy).toHaveBeenCalled();

    // Verify it called api.request with the backend endpoint, not a direct VAC URL
    const calledEndpoint = requestSpy.mock.calls[0][0];
    expect(calledEndpoint).toBe('/calls/vac/click2call');
    // Should NOT contain any direct VAC server IP
    expect(calledEndpoint).not.toContain('192.168');
  });

  test('uses POST method via api.request', async () => {
    const mockResponse = { status: 'success', data: {} };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    await api.vacClick2Call('9876543210');

    const options = requestSpy.mock.calls[0][1];
    expect(options.method).toBe('POST');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  vacHangup — Routed through backend proxy
// ─────────────────────────────────────────────────────────────────────────────
describe('api.vacHangup', () => {
  test('sends POST to /calls/vac/hangup with dispo', async () => {
    const mockResponse = { status: 'success', message: 'Call ended' };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    const result = await api.vacHangup('A');

    expect(requestSpy).toHaveBeenCalledWith('/calls/vac/hangup', {
      method: 'POST',
      body: { dispo: 'A' },
    });
    expect(result).toEqual(mockResponse);
  });

  test('defaults dispo to A when not provided', async () => {
    const mockResponse = { status: 'success', message: 'Call ended' };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    await api.vacHangup();

    const body = requestSpy.mock.calls[0][1].body;
    expect(body.dispo).toBe('A');
  });

  test('passes through backend errors', async () => {
    const error = new Error('VAC hangup failed');
    error.code = 'VAC_INTERNAL_ERROR';
    error.status = 500;
    vi.spyOn(api, 'request').mockRejectedValue(error);

    await expect(api.vacHangup('B')).rejects.toThrow('VAC hangup failed');
  });

  test('does NOT require agentId parameter', async () => {
    const mockResponse = { status: 'success', message: 'Call ended' };
    const requestSpy = vi.spyOn(api, 'request').mockResolvedValue(mockResponse);

    // No agentId argument — backend resolves it from the authenticated user
    await api.vacHangup('A');

    const body = requestSpy.mock.calls[0][1].body;
    expect(body).toEqual({ dispo: 'A' });
    expect(body.agent_id).toBeUndefined();
  });
});
