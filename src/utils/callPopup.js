/**
 * Dispatch an outgoing-call-pending custom event so the Layout component
 * shows the call popup in 'ready' state (green Call button, no API call yet).
 * The actual click2call API fires when the user clicks the green Call button.
 *
 * @param {Object} params
 * @param {string} params.phoneNumber - Customer phone number
 * @param {string|null} params.agentId - VAC agent ID
 * @param {Object|null} params.leadData - Lead info { id, name, uhid, phone }
 */
export function dispatchOutgoingCallPending({ phoneNumber, agentId, leadData = null }) {
  window.dispatchEvent(new CustomEvent('outgoing-call-pending', {
    detail: {
      call: {
        caller_number: phoneNumber,
        direction: 'outbound',
        status: 'pending',
        intercom_number: agentId,
      },
      leadInfo: leadData ? {
        id: leadData.id,
        name: leadData.name,
        uhid: leadData.uhid,
        phone: leadData.phone,
      } : null,
    },
  }));
}
