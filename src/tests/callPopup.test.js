import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatchOutgoingCallPending } from '../utils/callPopup';

describe('dispatchOutgoingCallPending', () => {
  let eventSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    eventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    eventSpy.mockRestore();
  });

  test('dispatches outgoing-call-pending custom event', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
    });

    expect(eventSpy).toHaveBeenCalledTimes(1);
    const event = eventSpy.mock.calls[0][0];
    expect(event).toBeInstanceOf(CustomEvent);
    expect(event.type).toBe('outgoing-call-pending');
  });

  test('includes correct call details in event payload', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail).toEqual({
      call: {
        caller_number: '9876543210',
        direction: 'outbound',
        status: 'pending',
        intercom_number: '1001',
      },
      leadInfo: null,
    });
  });

  test('includes leadInfo when leadData is provided', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
      leadData: {
        id: 5,
        name: 'John Doe',
        uhid: 'UHID-12345',
        phone: '9876543210',
      },
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.leadInfo).toEqual({
      id: 5,
      name: 'John Doe',
      uhid: 'UHID-12345',
      phone: '9876543210',
    });
  });

  test('sets leadInfo to null when leadData is not provided', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.leadInfo).toBeNull();
  });

  test('sets leadInfo to null when leadData is null', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
      leadData: null,
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.leadInfo).toBeNull();
  });

  test('call status is pending (not ringing) since API has not been called yet', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.call.status).toBe('pending');
    expect(event.detail.call.id).toBeUndefined();
  });

  test('handles undefined agentId gracefully', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: undefined,
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.call.intercom_number).toBeUndefined();
  });

  test('maps leadData fields correctly to leadInfo', () => {
    dispatchOutgoingCallPending({
      phoneNumber: '9876543210',
      agentId: '1001',
      leadData: {
        id: 10,
        name: 'Jane Smith',
        uhid: 'UHID-67890',
        phone: '9876543210',
        extraField: 'should-not-appear',
        email: 'jane@example.com',
      },
    });

    const event = eventSpy.mock.calls[0][0];
    expect(event.detail.leadInfo).toEqual({
      id: 10,
      name: 'Jane Smith',
      uhid: 'UHID-67890',
      phone: '9876543210',
    });
    expect(event.detail.leadInfo.extraField).toBeUndefined();
    expect(event.detail.leadInfo.email).toBeUndefined();
  });
});
