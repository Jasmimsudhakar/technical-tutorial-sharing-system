// script.js
// ─── All DOM interaction and backend integration ───────────────────────────────

// ─── Constants ────────────────────────────────────────────────────────────────
const HIGH_RATING_THRESHOLD = 4.5;
const MIN_RATINGS_FOR_HIGHLIGHT = 2;

// ─── Element references ───────────────────────────────────────────────────────
const tutorialForm  = document.getElementById("tutorialForm");
const tutorialList  = document.getElementById("tutorialList");
const authBar       = document.getElementById("authBar");
const authModal     = document.getElementById("authModal");
const modalOverlay  = document.getElementById("modalOverlay");
const modalClose    = document.getElementById("modalClose");
const loginForm     = document.getElementById("loginForm");
const registerForm  = document.getElementById("registerForm");
const loginNotice   = document.getElementById("loginNotice");
const loginPromptBtn= document.getElementById("loginPromptBtn");
const formError     = document.getElementById("formError");

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderStars(avg) {
  const rounded = Math.round(avg);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="display-star ${i < rounded ? "filled" : ""}">★</span>`
  ).join("");
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove("hidden");
}

function clearError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────────────────────
//  AUTH UI
// ─────────────────────────────────────────────────────────────────────────────

// FIX: renderAuthBar() keeps the header in sync with auth state.
//      The original app had no auth UI at all.
function renderAuthBar() {
  if (isLoggedIn()) {
    const user = getCurrentUser();
    authBar.innerHTML = `
      <span class="auth-greeting">👋 ${escapeHtml(user?.name || "")}</span>
      <button class="auth-btn outline" id="logoutBtn">Log Out</button>
    `;
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
    tutorialForm.classList.remove("hidden");
    loginNotice.classList.add("hidden");
  } else {
    authBar.innerHTML = `
      <button class="auth-btn" id="openLoginBtn">Log In / Register</button>
    `;
    document.getElementById("openLoginBtn").addEventListener("click", () => openModal("login"));
    tutorialForm.classList.add("hidden");
    loginNotice.classList.remove("hidden");
  }
}

// ─── Modal open / close ───────────────────────────────────────────────────────

function openModal(tab = "login") {
  switchTab(tab);
  authModal.classList.remove("hidden");
  modalOverlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  authModal.classList.add("hidden");
  modalOverlay.classList.add("hidden");
  document.body.style.overflow = "";
  clearError(document.getElementById("loginError"));
  clearError(document.getElementById("registerError"));
  loginForm.reset();
  registerForm.reset();
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  loginForm.classList.toggle("hidden", tab !== "login");
  registerForm.classList.toggle("hidden", tab !== "register");
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);
loginPromptBtn.addEventListener("click", () => openModal("login"));

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ─── Login submit ──────────────────────────────────────────────────────────────
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const loginError = document.getElementById("loginError");
  clearError(loginError);

  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    await loginUser(email, password);
    closeModal();
    renderAuthBar();
    loadTutorials(); // Refresh so like/rate buttons reflect logged-in state
  } catch (err) {
    showError(loginError, err.message);
  }
});

// ─── Register submit ───────────────────────────────────────────────────────────
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const registerError = document.getElementById("registerError");
  clearError(registerError);

  const name     = document.getElementById("regName").value.trim();
  const email    = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;

  try {
    await registerUser(name, email, password);
    closeModal();
    renderAuthBar();
    loadTutorials();
  } catch (err) {
    showError(registerError, err.message);
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  await logoutUser();
  renderAuthBar();
  loadTutorials();
}

// ─────────────────────────────────────────────────────────────────────────────
//  RENDER TUTORIALS
// ─────────────────────────────────────────────────────────────────────────────

function renderTutorials(tutorials) {
  if (!tutorials || !tutorials.length) {
    tutorialList.innerHTML = `<p class="empty-text">No tutorials yet — be the first to publish one!</p>`;
    return;
  }

  // Sort by averageRating descending
  const sorted = [...tutorials].sort((a, b) =>
    (b.averageRating || 0) - (a.averageRating || 0)
  );

  tutorialList.innerHTML = sorted.map((t) => {
    const avg           = t.averageRating || 0;
    const totalRatings  = t.ratings?.length || 0;
    const totalLikes    = t.likes?.length || 0;
    const isHighlighted = avg >= HIGH_RATING_THRESHOLD && totalRatings >= MIN_RATINGS_FOR_HIGHLIGHT;

    // FIX: steps now comes from the backend as an array (no .split() needed)
    const stepsHtml = (t.steps || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");

    const commentsHtml = (t.comments || []).length
      ? (t.comments || []).map((c) => `
          <div class="comment-item" data-comment-id="${c._id}">
            <strong>${escapeHtml(c.name)}</strong>
            <p>${escapeHtml(c.text)}</p>
            <div class="comment-meta">
              <span class="comment-date">${new Date(c.createdAt).toLocaleDateString()}</span>
              ${
                // FIX: Show delete button only for the comment's own author
                isLoggedIn() && getCurrentUser()?.id === c.user
                  ? `<button class="del-comment-btn" data-tutorial-id="${t._id}" data-comment-id="${c._id}">Delete</button>`
                  : ""
              }
            </div>
          </div>
        `).join("")
      : `<p class="empty-text">No comments yet.</p>`;

    // FIX: Show edit/delete only to the tutorial's author
    const isAuthor = isLoggedIn() && getCurrentUser()?.id === t.author;

    return `
      <article class="tutorial-card ${isHighlighted ? "highlighted" : ""}" data-id="${t._id}">
        <div class="card-top">
          <div>
            <h3>${escapeHtml(t.title)}</h3>
            <p class="author">By ${escapeHtml(t.authorName)}</p>
          </div>
          <div class="card-top-right">
            ${isHighlighted ? `<span class="badge">⭐ Highly Rated</span>` : ""}
            ${isAuthor ? `
              <button class="icon-btn delete-btn" data-id="${t._id}" title="Delete tutorial">🗑</button>
            ` : ""}
          </div>
        </div>

        <div class="block">
          <h4>Explanation</h4>
          <p>${escapeHtml(t.explanation)}</p>
        </div>

        <div class="block">
          <h4>Steps</h4>
          <ol>${stepsHtml}</ol>
        </div>

        <div class="block">
          <h4>Code Example</h4>
          <pre><code>${escapeHtml(t.code)}</code></pre>
        </div>

        ${t.videoLink ? `
          <div class="block">
            <a href="${escapeHtml(t.videoLink)}" class="video-link" target="_blank" rel="noopener noreferrer">
              ▶ Watch Video
            </a>
          </div>
        ` : ""}

        <div class="rating-summary">
          <span class="avg-number">${avg ? avg.toFixed(1) : "0.0"}/5</span>
          <div class="display-stars">${renderStars(avg)}</div>
          <span>${totalRatings} rating(s)</span>
          <span class="like-count">❤️ ${totalLikes}</span>
        </div>

        <div class="vote-row">
          ${isLoggedIn() ? `
            <p>Rate this tutorial:</p>
            <div class="star-buttons">
              ${[1,2,3,4,5].map((n) => `
                <button type="button" class="star-btn" data-id="${t._id}" data-rate="${n}">★ ${n}</button>
              `).join("")}
            </div>
            <button type="button" class="like-btn" data-id="${t._id}">❤️ Like</button>
          ` : `<p class="muted-action">Log in to rate or like</p>`}
        </div>

        <div class="comments">
          <h4>Comments</h4>
          <div class="comment-list">${commentsHtml}</div>

          ${isLoggedIn() ? `
            <div class="comment-form">
              <textarea class="comment-text" rows="3" placeholder="Write a comment…"></textarea>
              <button type="button" class="comment-btn" data-id="${t._id}">Post Comment</button>
            </div>
          ` : `<p class="muted-action">Log in to leave a comment</p>`}
        </div>
      </article>
    `;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOAD TUTORIALS FROM BACKEND
// ─────────────────────────────────────────────────────────────────────────────

// FIX: Original loadTutorials() only read from localStorage.
//      Now it fetches from the backend, falling back to an error state.
async function loadTutorials() {
  tutorialList.innerHTML = `<p class="empty-text">Loading…</p>`;
  try {
    const tutorials = await getAllTutorials();
    renderTutorials(tutorials);
  } catch (err) {
    tutorialList.innerHTML = `
      <p class="empty-text error-text">
        ⚠️ Could not load tutorials.<br/>
        Make sure the backend server is running on <code>http://localhost:5000</code>.
      </p>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PUBLISH TUTORIAL
// ─────────────────────────────────────────────────────────────────────────────

tutorialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError(formError);

  if (!isLoggedIn()) {
    openModal("login");
    return;
  }

  const title       = document.getElementById("title").value.trim();
  const explanation = document.getElementById("explanation").value.trim();
  const stepsRaw    = document.getElementById("steps").value;
  const code        = document.getElementById("code").value.trim();
  const videoLink   = document.getElementById("videoLink").value.trim();

  // FIX: Split steps in the frontend so we send a clean array, not a raw string
  const steps = stepsRaw.split("\n").map((s) => s.trim()).filter(Boolean);

  if (!steps.length) {
    showError(formError, "Please enter at least one step.");
    return;
  }

  const submitBtn = tutorialForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Publishing…";

  try {
    await createTutorial({ title, explanation, steps, code, videoLink });
    tutorialForm.reset();
    await loadTutorials(); // Refresh the list from the server
  } catch (err) {
    showError(formError, err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Publish Tutorial";
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  EVENT DELEGATION — rate, like, comment, delete
// ─────────────────────────────────────────────────────────────────────────────

tutorialList.addEventListener("click", async (e) => {
  // ─── Rate ──────────────────────────────────────────────────────────────────
  const rateBtn = e.target.closest(".star-btn");
  if (rateBtn) {
    const id     = rateBtn.dataset.id;
    const rating = Number(rateBtn.dataset.rate);
    try {
      await rateTutorial(id, rating);
      await loadTutorials();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  // ─── Like ──────────────────────────────────────────────────────────────────
  const likeBtn = e.target.closest(".like-btn");
  if (likeBtn) {
    try {
      await likeTutorial(likeBtn.dataset.id);
      await loadTutorials();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  // ─── Post comment ─────────────────────────────────────────────────────────
  const commentBtn = e.target.closest(".comment-btn");
  if (commentBtn) {
    const card      = commentBtn.closest(".tutorial-card");
    const textInput = card.querySelector(".comment-text");
    const text      = textInput.value.trim();
    if (!text) return;

    commentBtn.disabled = true;
    try {
      await addComment(commentBtn.dataset.id, text);
      textInput.value = "";
      await loadTutorials();
    } catch (err) {
      alert(err.message);
    } finally {
      commentBtn.disabled = false;
    }
    return;
  }

  // ─── Delete comment ───────────────────────────────────────────────────────
  const delCommentBtn = e.target.closest(".del-comment-btn");
  if (delCommentBtn) {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(delCommentBtn.dataset.tutorialId, delCommentBtn.dataset.commentId);
      await loadTutorials();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  // ─── Delete tutorial ──────────────────────────────────────────────────────
  const deleteBtn = e.target.closest(".delete-btn");
  if (deleteBtn) {
    if (!confirm("Delete this tutorial? This cannot be undone.")) return;
    try {
      await deleteTutorial(deleteBtn.dataset.id);
      await loadTutorials();
    } catch (err) {
      alert(err.message);
    }
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  INITIALISE
// ─────────────────────────────────────────────────────────────────────────────

renderAuthBar();
loadTutorials();
