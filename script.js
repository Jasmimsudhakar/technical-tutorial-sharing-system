const tutorialForm = document.getElementById("tutorialForm");
const tutorialList = document.getElementById("tutorialList");

const HIGH_RATING_THRESHOLD = 4.5;
const MIN_RATINGS_FOR_HIGHLIGHT = 2;
const STORAGE_KEY = "tech_tutorials_frontend_only";

const sampleTutorials = [
  {
    id: "t1",
    title: "Getting Started with JavaScript Arrays",
    author: "Aarav",
    explanation:
      "This tutorial explains how to create arrays, add items, and use common array methods in JavaScript.",
    steps: [
      "Create an array using square brackets.",
      "Access items using their index position.",
      "Use push() to add new values at the end.",
      "Use map() to transform array items."
    ],
    code:
`const numbers = [1, 2, 3];
numbers.push(4);

const doubled = numbers.map(num => num * 2);

console.log(numbers); // [1, 2, 3, 4]
console.log(doubled); // [2, 4, 6, 8]`,
    ratings: [5, 5, 4, 5],
    comments: [
      {
        name: "Nina",
        text: "Very clear explanation and easy to understand.",
        date: "2026-04-20"
      },
      {
        name: "Rahul",
        text: "Helpful example for beginners.",
        date: "2026-04-21"
      }
    ]
  },
  {
    id: "t2",
    title: "Basic HTML Form Validation",
    author: "Meera",
    explanation:
      "Learn how to validate forms with HTML required fields and simple JavaScript checks.",
    steps: [
      "Create form fields with labels.",
      "Use the required attribute for mandatory inputs.",
      "Listen for form submission in JavaScript.",
      "Show a message when validation fails."
    ],
    code:
`const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
  const email = document.getElementById("email").value.trim();

  if (!email.includes("@")) {
    e.preventDefault();
    alert("Please enter a valid email.");
  }
});`,
    ratings: [4, 4, 3],
    comments: [
      {
        name: "Sara",
        text: "Good intro, maybe add regex validation too.",
        date: "2026-04-22"
      }
    ]
  }
];

let tutorials = loadTutorials();

function loadTutorials() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleTutorials));
  return sampleTutorials;
}

function saveTutorials() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tutorials));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getAverageRating(ratings = []) {
  if (!ratings.length) return 0;
  return ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
}

function renderStars(avg) {
  const rounded = Math.round(avg);
  return Array.from({ length: 5 }, (_, i) => {
    return `<span class="display-star ${i < rounded ? "filled" : ""}">★</span>`;
  }).join("");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTutorials() {
  const sortedTutorials = [...tutorials].sort(
    (a, b) => getAverageRating(b.ratings) - getAverageRating(a.ratings)
  );

  if (!sortedTutorials.length) {
    tutorialList.innerHTML = `<p class="empty-text">No tutorials available.</p>`;
    return;
  }

  tutorialList.innerHTML = sortedTutorials
    .map((tutorial) => {
      const avg = getAverageRating(tutorial.ratings);
      const isHighlyRated =
        avg >= HIGH_RATING_THRESHOLD &&
        tutorial.ratings.length >= MIN_RATINGS_FOR_HIGHLIGHT;

      return `
        <article class="tutorial-card ${isHighlyRated ? "highlighted" : ""}" data-id="${tutorial.id}">
          <div class="card-top">
            <div>
              <h3>${escapeHtml(tutorial.title)}</h3>
              <p class="author">By ${escapeHtml(tutorial.author)}</p>
            </div>
            ${isHighlyRated ? `<span class="badge">Highly Rated</span>` : ""}
          </div>

          <div class="block">
            <h4>Explanation</h4>
            <p>${escapeHtml(tutorial.explanation)}</p>
          </div>

          <div class="block">
            <h4>Steps</h4>
            <ol>
              ${tutorial.steps
                .map((step) => `<li>${escapeHtml(step)}</li>`)
                .join("")}
            </ol>
          </div>

          <div class="block">
            <h4>Code Example</h4>
            <pre><code>${escapeHtml(tutorial.code)}</code></pre>
          </div>

          <div class="rating-summary">
            <span class="avg-number">${avg ? avg.toFixed(1) : "0.0"}/5</span>
            <div class="display-stars">${renderStars(avg)}</div>
            <span>${tutorial.ratings.length} rating(s)</span>
          </div>

          <div class="vote-row">
            <p>Rate this tutorial:</p>
            <div class="star-buttons">
              <button type="button" class="star-btn" data-id="${tutorial.id}" data-rate="1">★ 1</button>
              <button type="button" class="star-btn" data-id="${tutorial.id}" data-rate="2">★ 2</button>
              <button type="button" class="star-btn" data-id="${tutorial.id}" data-rate="3">★ 3</button>
              <button type="button" class="star-btn" data-id="${tutorial.id}" data-rate="4">★ 4</button>
              <button type="button" class="star-btn" data-id="${tutorial.id}" data-rate="5">★ 5</button>
            </div>
          </div>

          <div class="comments">
            <h4>Comments</h4>

            <div class="comment-list">
              ${
                tutorial.comments.length
                  ? tutorial.comments
                      .map(
                        (comment) => `
                      <div class="comment-item">
                        <strong>${escapeHtml(comment.name)}</strong>
                        <p>${escapeHtml(comment.text)}</p>
                        <div class="comment-date">${escapeHtml(comment.date)}</div>
                      </div>
                    `
                      )
                      .join("")
                  : `<p class="empty-text">No comments yet.</p>`
              }
            </div>

            <div class="comment-form">
              <input type="text" class="commenter-name" placeholder="Your name" />
              <textarea class="comment-text" rows="3" placeholder="Write a comment..."></textarea>
              <button type="button" class="comment-btn" data-id="${tutorial.id}">
                Post Comment
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

tutorialForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const explanation = document.getElementById("explanation").value.trim();
  const steps = document
    .getElementById("steps")
    .value
    .split("\n")
    .map((step) => step.trim())
    .filter(Boolean);
  const code = document.getElementById("code").value.trim();

  const newTutorial = {
    id: generateId(),
    title,
    author,
    explanation,
    steps,
    code,
    ratings: [],
    comments: []
  };

  tutorials.unshift(newTutorial);
  saveTutorials();
  renderTutorials();
  tutorialForm.reset();
});

tutorialList.addEventListener("click", function (e) {
  const rateButton = e.target.closest("[data-rate]");
  const commentButton = e.target.closest(".comment-btn");

  if (rateButton) {
    const tutorialId = rateButton.dataset.id;
    const ratingValue = Number(rateButton.dataset.rate);

    const tutorial = tutorials.find((item) => item.id === tutorialId);
    if (tutorial) {
      tutorial.ratings.push(ratingValue);
      saveTutorials();
      renderTutorials();
    }
  }

  if (commentButton) {
    const tutorialId = commentButton.dataset.id;
    const tutorialCard = commentButton.closest(".tutorial-card");
    const nameInput = tutorialCard.querySelector(".commenter-name");
    const textInput = tutorialCard.querySelector(".comment-text");

    const name = nameInput.value.trim() || "Anonymous";
    const text = textInput.value.trim();

    if (!text) return;

    const tutorial = tutorials.find((item) => item.id === tutorialId);
    if (tutorial) {
      tutorial.comments.push({
        name,
        text,
        date: new Date().toLocaleDateString()
      });

      saveTutorials();
      renderTutorials();
    }
  }
});

renderTutorials();