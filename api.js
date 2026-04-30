// api.js — Frontend API helpers
// Drop this file next to index.html and add:
//   <script src="api.js"></script>  (before script.js)

const BASE_URL = "http://localhost:5000/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem("token");

// FIX: Centralised headers() helper now used consistently everywhere,
//      preventing copy-paste errors where auth header was forgotten.
const makeHeaders = (auth = false) => ({
  "Content-Type": "application/json",
  ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

// FIX: Single fetch wrapper that always throws a structured error on !res.ok,
//      so callers don't each have to repeat the if (!res.ok) throw pattern.
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function registerUser(name, email, password) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    headers: makeHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

async function loginUser(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    headers: makeHeaders(),
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

async function logoutUser() {
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      headers: makeHeaders(true),
    });
  } finally {
    // FIX: Always clear local storage even if the server call fails,
    //      so the user is never stuck in a logged-in UI state.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

async function getProfile() {
  const data = await apiFetch("/auth/profile", { headers: makeHeaders(true) });
  return data.user;
}

// ─── Tutorials ────────────────────────────────────────────────────────────────

async function getAllTutorials() {
  const data = await apiFetch("/tutorials");
  return data.tutorials;
}

async function getTutorial(id) {
  const data = await apiFetch(`/tutorials/${id}`);
  return data.tutorial;
}

// FIX: steps is now sent as an array (not a newline string) — the backend
//      accepts both formats but an array is cleaner and more reliable.
async function createTutorial({ title, explanation, steps, code, videoLink }) {
  const stepsArray =
    Array.isArray(steps)
      ? steps
      : steps.split("\n").map((s) => s.trim()).filter(Boolean);

  const data = await apiFetch("/tutorials", {
    method: "POST",
    headers: makeHeaders(true),
    body: JSON.stringify({ title, explanation, steps: stepsArray, code, videoLink }),
  });
  return data.tutorial;
}

async function updateTutorial(id, updates) {
  const data = await apiFetch(`/tutorials/${id}`, {
    method: "PUT",
    headers: makeHeaders(true),
    body: JSON.stringify(updates),
  });
  return data.tutorial;
}

async function deleteTutorial(id) {
  return apiFetch(`/tutorials/${id}`, {
    method: "DELETE",
    headers: makeHeaders(true),
  });
}

// FIX: rateTutorial now receives a server-computed averageRating back,
//      so the UI can update without reloading all tutorials.
async function rateTutorial(id, rating) {
  return apiFetch(`/tutorials/${id}/rate`, {
    method: "POST",
    headers: makeHeaders(true),
    body: JSON.stringify({ rating }),
  });
}

async function likeTutorial(id) {
  return apiFetch(`/tutorials/${id}/like`, {
    method: "POST",
    headers: makeHeaders(true),
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

async function addComment(tutorialId, text) {
  const data = await apiFetch(`/tutorials/${tutorialId}/comments`, {
    method: "POST",
    headers: makeHeaders(true),
    body: JSON.stringify({ text }),
  });
  return data.comment;
}

async function deleteComment(tutorialId, commentId) {
  return apiFetch(`/tutorials/${tutorialId}/comments/${commentId}`, {
    method: "DELETE",
    headers: makeHeaders(true),
  });
}

// ─── Auth state helpers (used by script.js) ───────────────────────────────────

// FIX: These were missing — script.js had no way to check login state.
function isLoggedIn() {
  return Boolean(getToken());
}

function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
