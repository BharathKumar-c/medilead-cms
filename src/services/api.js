const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this._onUnauthorized = null;
    this._onServiceUnavailable = null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  onUnauthorized(callback) {
    this._onUnauthorized = callback;
  }

  onServiceUnavailable(callback) {
    this._onServiceUnavailable = callback;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);

    // Parse response body defensively — 204 and some errors have no JSON body
    let data = null;
    const contentType = response.headers.get('content-type') || '';
    if (response.status !== 204 && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.setToken(null);
        localStorage.removeItem('user');
        if (this._onUnauthorized) {
          this._onUnauthorized();
        }
      }
      if (response.status === 503 && data?.code === 'SERVICE_UNAVAILABLE') {
        if (this._onServiceUnavailable) {
          this._onServiceUnavailable();
        }
      }
      const error = new Error(data?.message || 'Request failed');
      error.status = response.status;
      error.code = data?.code;
      error.errors = data?.errors;
      throw error;
    }

    return data;
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    this.setToken(data.data.token);
    return data.data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: userData,
    });
    this.setToken(data.data.token);
    return data.data;
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  async updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  }

  async getSettings() {
    return this.request('/auth/settings');
  }

  async updateSettings(settings) {
    return this.request('/auth/settings', {
      method: 'PUT',
      body: settings,
    });
  }

  // User Management (Super Admin)
  async getUsers() {
    return this.request('/auth/users');
  }

  async createUser(userData) {
    return this.request('/auth/users', {
      method: 'POST',
      body: userData,
    });
  }

  async updateUser(id, userData) {
    return this.request(`/auth/users/${id}`, {
      method: 'PUT',
      body: userData,
    });
  }

  async resetUserPassword(id, newPassword) {
    return this.request(`/auth/users/${id}/password`, {
      method: 'PUT',
      body: { newPassword },
    });
  }

  async deactivateUser(id) {
    return this.request(`/auth/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Roles
  async getRoles() {
    return this.request('/roles');
  }

  async getRole(id) {
    return this.request(`/roles/${id}`);
  }

  async createRole(data) {
    return this.request('/roles', {
      method: 'POST',
      body: data,
    });
  }

  async updateRole(id, data) {
    return this.request(`/roles/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteRole(id) {
    return this.request(`/roles/${id}`, {
      method: 'DELETE',
    });
  }

  async getRolePermissions(id) {
    return this.request(`/roles/${id}/permissions`);
  }

  async setRolePermissions(id, permissionIds) {
    return this.request(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: { permission_ids: permissionIds },
    });
  }

  async getAllPermissions() {
    return this.request('/roles/permissions/all');
  }

  // Calls (SIP)
  async getCalls(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/calls?${query}`);
  }

  async getCallStats() {
    return this.request('/calls/stats');
  }

  async createCallLog(callData) {
    return this.request('/calls', {
      method: 'POST',
      body: callData,
    });
  }

  async updateCallStatus(id, status, notes) {
    return this.request(`/calls/${id}/status`, {
      method: 'PUT',
      body: { status, notes },
    });
  }

  async triggerSipEvent(eventData) {
    return this.request('/calls/sip-event', {
      method: 'POST',
      body: eventData,
    });
  }

  async getCallHistoryByPhone(phone) {
    return this.request(`/calls/phone/${encodeURIComponent(phone)}`);
  }

  async getTelephonyCallLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/calls/telephony${query ? `?${query}` : ''}`);
  }

  async getTelephonyCallStats() {
    return this.request('/calls/telephony/stats');
  }

  // Leads
  async getLeadSources() {
    return this.request('/leads/master-data');
  }

  async getDepartments(branchId) {
    const params = branchId ? `?branch_id=${branchId}` : '';
    return this.request(`/leads/departments${params}`);
  }

  async getPriorities() {
    return this.request('/leads/master-data');
  }

  async getLeadStatuses() {
    return this.request('/leads/master-data');
  }

  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/leads?${query}`);
  }

  async getLeadMetrics() {
    return this.request('/leads/metrics');
  }

  async getLead(id) {
    return this.request(`/leads/${id}`);
  }

  async getLeadByUhid(uhid) {
    return this.request(`/leads/uhid/${encodeURIComponent(uhid)}`);
  }

  async lookupPincode(pincode) {
    return this.request(`/leads/pincode/${encodeURIComponent(pincode)}`);
  }

  async getLeadByPhone(phone) {
    return this.request(`/leads/phone/${encodeURIComponent(phone)}`);
  }

  async getUhidsByPhone(phone) {
    return this.request(`/leads/uhids-by-phone/${encodeURIComponent(phone)}`);
  }

  async checkDuplicatePhone(phone) {
    return this.request(`/leads?search=${encodeURIComponent(phone)}&limit=1`);
  }

  async getLeadHistory(leadId) {
    return this.request(`/leads/${leadId}/history`);
  }

  async createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: leadData,
    });
  }

  async updateLead(id, leadData) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: leadData,
    });
  }

  async assignLead(leadId, userId) {
    return this.request(`/leads/${leadId}/assign`, { method: 'PUT', body: { assigned_to: userId } });
  }

  async deleteLead(id) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE',
    });
  }

  // Branches
  async getBranches() {
    return this.request('/branches');
  }

  async getBranchDepartments(branchId) {
    return this.request(`/branches/${branchId}/departments`);
  }

  // ── Master Data CRUD ──

  // Lead Sources
  async getMasterLeadSources() { return this.request('/masters/lead-sources'); }
  async createMasterLeadSource(data) { return this.request('/masters/lead-sources', { method: 'POST', body: data }); }
  async updateMasterLeadSource(id, data) { return this.request(`/masters/lead-sources/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterLeadSource(id) { return this.request(`/masters/lead-sources/${id}`, { method: 'DELETE' }); }

  // Priorities
  async getMasterPriorities() { return this.request('/masters/priorities'); }
  async createMasterPriority(data) { return this.request('/masters/priorities', { method: 'POST', body: data }); }
  async updateMasterPriority(id, data) { return this.request(`/masters/priorities/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterPriority(id) { return this.request(`/masters/priorities/${id}`, { method: 'DELETE' }); }

  // Lead Statuses
  async getMasterLeadStatuses() { return this.request('/masters/lead-statuses'); }
  async createMasterLeadStatus(data) { return this.request('/masters/lead-statuses', { method: 'POST', body: data }); }
  async updateMasterLeadStatus(id, data) { return this.request(`/masters/lead-statuses/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterLeadStatus(id) { return this.request(`/masters/lead-statuses/${id}`, { method: 'DELETE' }); }

  // Departments
  async getMasterDepartments() { return this.request('/masters/departments'); }
  async createMasterDepartment(data) { return this.request('/masters/departments', { method: 'POST', body: data }); }
  async updateMasterDepartment(id, data) { return this.request(`/masters/departments/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterDepartment(id) { return this.request(`/masters/departments/${id}`, { method: 'DELETE' }); }

  // Branches (master)
  async getMasterBranches() { return this.request('/masters/branches'); }
  async createMasterBranch(data) { return this.request('/masters/branches', { method: 'POST', body: data }); }
  async updateMasterBranch(id, data) { return this.request(`/masters/branches/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterBranch(id) { return this.request(`/masters/branches/${id}`, { method: 'DELETE' }); }
  async getMasterBranchDepartments(branchId) { return this.request(`/masters/branches/${branchId}/departments`); }

  // Doctors
  async getMasterDoctors() { return this.request('/masters/doctors'); }
  async createMasterDoctor(data) { return this.request('/masters/doctors', { method: 'POST', body: data }); }
  async updateMasterDoctor(id, data) { return this.request(`/masters/doctors/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterDoctor(id) { return this.request(`/masters/doctors/${id}`, { method: 'DELETE' }); }

  // Pincodes
  async getMasterPincodes(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/masters/pincodes${query ? `?${query}` : ''}`);
  }
  async createMasterPincode(data) { return this.request('/masters/pincodes', { method: 'POST', body: data }); }
  async updateMasterPincode(id, data) { return this.request(`/masters/pincodes/${id}`, { method: 'PUT', body: data }); }
  async deleteMasterPincode(id) { return this.request(`/masters/pincodes/${id}`, { method: 'DELETE' }); }

  // Appointments
  async getAppointments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/appointments?${query}`);
  }

  async getTodayOverview() {
    return this.request('/appointments/today');
  }

  async getCalendarData(year, month) {
    return this.request(`/appointments/calendar?year=${year}&month=${month}`);
  }

  async getAppointment(id) {
    return this.request(`/appointments/${id}`);
  }

  async bookAppointment(data) {
    return this.request('/appointments', {
      method: 'POST',
      body: data,
    });
  }

  async updateAppointment(id, data) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async rescheduleAppointment(id, data) {
    return this.request(`/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: data,
    });
  }

  async cancelAppointment(id, reason) {
    return this.request(`/appointments/${id}/cancel`, {
      method: 'PUT',
      body: { reason },
    });
  }

  async markNoShow(id) {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: { status: 'No Show' },
    });
  }

  async getAvailableSlots(doctorId, date) {
    return this.request(`/appointments/slots?doctor_id=${doctorId}&date=${date}`);
  }

  async getDoctors(department, branchId) {
    const params = new URLSearchParams();
    if (department) params.set('department', department);
    if (branchId) params.set('branch_id', branchId);
    const query = params.toString();
    return this.request(`/appointments/doctors${query ? `?${query}` : ''}`);
  }

  async getProviders(department) {
    const params = department ? `?department=${encodeURIComponent(department)}` : '';
    return this.request(`/leads/providers${params}`);
  }

  async deleteAppointment(id) {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard
  async getDashboardMetrics(range = 'all') {
    return this.request(`/dashboard/metrics?range=${range}`);
  }

  async getActivityLog(filter, range = 'all') {
    const params = new URLSearchParams();
    if (filter) params.set('type', filter);
    if (range) params.set('range', range);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/dashboard/activity${query}`);
  }

  async exportActivityLog(filter, range = 'all') {
    const params = new URLSearchParams();
    if (filter) params.set('type', filter);
    if (range) params.set('range', range);
    const query = params.toString() ? `?${params.toString()}` : '';
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/dashboard/activity/export${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  // Reports
  async getReportsOverview() {
    return this.request('/reports/overview');
  }

  async getCallVolume() {
    return this.request('/reports/call-volume');
  }

  async getReportLeadSources() {
    return this.request('/reports/lead-sources');
  }

  async getDepartmentPerformance() {
    return this.request('/reports/department-performance');
  }

  async getProviderLeaderboard() {
    return this.request('/reports/provider-leaderboard');
  }

  async getStatusBreakdown() {
    return this.request('/reports/status-breakdown');
  }

  async getWeeklyTrend() {
    return this.request('/reports/weekly-trend');
  }

  async getTelecallerPerformance() {
    return this.request('/reports/telecallers');
  }

  async getConversionFunnel() {
    return this.request('/reports/conversion-funnel');
  }

  async getCallAnalytics(days = 30) {
    return this.request(`/reports/call-analytics?days=${days}`);
  }

  async getAppointmentStats() {
    return this.request('/reports/appointment-stats');
  }

  async getDailyActivity() {
    return this.request('/reports/daily-activity');
  }

  async getBranchLeadReport() {
    return this.request('/reports/branch-leads');
  }

  // Report Exports
  async getExportSummary(type, from, to) {
    return this.request(`/reports/export/summary?type=${type}&from=${from}&to=${to}`);
  }
  async createExport(data) {
    return this.request('/reports/export', { method: 'POST', body: data });
  }
  async getExportJobs() {
    return this.request('/reports/export/jobs');
  }
  async checkExportStatus(id) {
    return this.request(`/reports/export/check/${id}`);
  }
  async downloadExport(id) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/reports/export/download/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  // Notifications
  async getNotifications(unreadOnly = false) {
    const query = unreadOnly ? '?unread_only=true' : '';
    return this.request(`/notifications${query}`);
  }

  async createNotification(data) {
    return this.request('/notifications', {
      method: 'POST',
      body: data,
    });
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async unlockLicense(unlockKey) {
    const serverBase = API_BASE.endsWith('/api')
      ? API_BASE.slice(0, -4)
      : API_BASE;
    const url = `${serverBase}/internal/license/unlock`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlockKey }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || 'Unlock failed');
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }

    return data;
  }

  async getLicenseStatus() {
    return this.request('/license/status');
  }

  async verifyLicenseKey(accessKey) {
    return this.request('/license/verify-key', {
      method: 'POST',
      body: JSON.stringify({ accessKey }),
    });
  }

  async updateLicenseExpiry(expiryDate) {
    const serverBase = API_BASE.endsWith('/api')
      ? API_BASE.slice(0, -4)
      : API_BASE;
    const url = `${serverBase}/internal/license/update-expiry`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryDate }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || 'Update failed');
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }

    return data;
  }

  // Forgot / Reset Password
  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }
}

export const api = new ApiService();
export default api;
