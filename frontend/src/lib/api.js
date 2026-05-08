import axios from "axios";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

// Credentials (httpOnly cookie) are sent automatically via withCredentials.
// No token is stored in localStorage.
export const api = axios.create({ baseURL: API, withCredentials: true });

const GUEST_KEY = "memento_guest_session_id";

export const getGuestSessionId = () => {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
};

export const clearGuestSessionId = () => {
  localStorage.removeItem(GUEST_KEY);
};
