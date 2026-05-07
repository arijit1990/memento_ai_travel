import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "memento_session_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

const GUEST_KEY = "memento_guest_session_id";

export const getGuestSessionId = () => {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 14)}_${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
};

export const clearGuestSessionId = () => {
  localStorage.removeItem(GUEST_KEY);
};
