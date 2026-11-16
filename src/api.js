import { Capacitor } from '@capacitor/core';

const DEFAULT_API_URL = Capacitor.isNativePlatform()
  ? 'http://10.0.2.2:8080/api'
  : 'http://localhost:8080/api';
const TOKEN_KEY = 'skillbridge.token';

async function getApiUrl() {
  if (window.skillbridgeDesktop?.getApiUrl) {
    return window.skillbridgeDesktop.getApiUrl();
  }
  return import.meta.env.VITE_API_URL || DEFAULT_API_URL;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, options = {}) {
  const token = getToken();
  const hasBody = options.body !== undefined && options.body !== null;
  const body = hasBody && typeof options.body !== 'string'
    ? JSON.stringify(options.body)
    : options.body;
  let response;
  try {
    const apiUrl = await getApiUrl();
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      body,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error('SkillBridge could not reach the server. Check your connection and try again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.message || payload?.detail || payload?.title || `Request failed (${response.status}). Please try again.`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}
