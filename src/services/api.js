const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this._onUnauthorized = null;
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
  async getDashboardMetrics() {
    return this.request('/dashboard/metrics');
  }

  async getActivityLog(filter) {
    const query = filter ? `?filter=${filter}` : '';
    return this.request(`/dashboard/activity${query}`);
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

  logout() {
    this.setToken(null);
    localStorage.removeItem('user');
  }
}

export const api = new ApiService();
export default api;
