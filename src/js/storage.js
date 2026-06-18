/**
 * storage.js — Async API Client v2
 *
 * All reads/writes go through the Express REST API (server.js).
 * Auth state is managed server-side via express-session.
 * Only bp_active_profile is kept in localStorage (just the ID reference).
 */

const Storage = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  async register(email, password) {
    const res  = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data; // { id, email, avatar }
  },

  async login(email, password) {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data; // { id, email, avatar }
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    this.setActiveProfileId(null);
  },

  async getMe() {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) return null;
    if (!res.ok) return null;
    return res.json(); // { id, email, avatar }
  },

  async uploadAvatar(file) {
    const form = new FormData();
    form.append('avatar', file);
    const res  = await fetch('/api/auth/avatar', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data; // { avatar: '/uploads/avatars/...' }
  },

  // ── Active profile tracking (localStorage only) ──────────────────────────

  getActiveProfileId() {
    return localStorage.getItem('bp_active_profile');
  },

  setActiveProfileId(id) {
    if (id) localStorage.setItem('bp_active_profile', id);
    else    localStorage.removeItem('bp_active_profile');
  },

  // ── Profiles ──────────────────────────────────────────────────────────────

  async getProfiles() {
    const res = await fetch('/api/profiles');
    if (!res.ok) throw new Error('Failed to load profiles');
    return res.json();
  },

  async getProfile(id) {
    const res = await fetch(`/api/profiles/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async createProfile(data) {
    const res = await fetch('/api/profiles', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
  },

  async updateProfile(id, data) {
    const res = await fetch(`/api/profiles/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async deleteProfile(id) {
    const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete profile');
    this.setActiveProfileId(null);
    return res.json();
  },

  // ── Dashboard state ───────────────────────────────────────────────────────

  async getDashboard(profileId) {
    const res = await fetch(`/api/profiles/${profileId}/dashboard`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveDashboard(profileId, data) {
    const res = await fetch(`/api/profiles/${profileId}/dashboard`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save dashboard');
    return res.json();
  },

  // ── Workout log ───────────────────────────────────────────────────────────

  async getLog(profileId) {
    const res = await fetch(`/api/profiles/${profileId}/log`);
    if (!res.ok) return [];
    return res.json();
  },

  async addLogEntry(profileId, entry) {
    const res = await fetch(`/api/profiles/${profileId}/log`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(entry)
    });
    if (!res.ok) throw new Error('Failed to save log entry');
    return res.json();
  },

  async deleteLogEntry(profileId, entryId) {
    const res = await fetch(`/api/profiles/${profileId}/log/${entryId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete log entry');
    return res.json();
  },

  // ── Health check ──────────────────────────────────────────────────────────

  async ping() {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  }
};
