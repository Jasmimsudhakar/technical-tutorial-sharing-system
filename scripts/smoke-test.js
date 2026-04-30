require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../User");
const Tutorial = require("../Tutorial");

const baseUrl = process.env.API_BASE_URL || "http://localhost:5000/api";
const stamp = Date.now();
const email = `smoke-${stamp}@example.com`;
const password = "SmokeTest123";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${data.message || text}`);
  }

  return data;
}

async function cleanup(tutorialId) {
  if (!process.env.MONGO_URI) return;

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });

  if (tutorialId) {
    await Tutorial.deleteOne({ _id: tutorialId });
  }
  await User.deleteOne({ email });
  await mongoose.disconnect();
}

async function run() {
  let token;
  let tutorialId;
  let commentId;

  try {
    await request("/tutorials");

    const registered = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Smoke Test",
        email,
        password,
      }),
    });
    token = registered.token;

    await request("/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const created = await request("/tutorials", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: `Smoke Tutorial ${stamp}`,
        explanation: "Temporary tutorial created by the smoke test.",
        steps: ["Create", "Verify", "Clean up"],
        code: "console.log('smoke test');",
        videoLink: "",
      }),
    });
    tutorialId = created.tutorial._id;

    await request(`/tutorials/${tutorialId}/rate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating: 5 }),
    });

    await request(`/tutorials/${tutorialId}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const commented = await request(`/tutorials/${tutorialId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: "Smoke comment" }),
    });
    commentId = commented.comment._id;

    await request(`/tutorials/${tutorialId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    await request(`/tutorials/${tutorialId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    tutorialId = null;

    console.log("Smoke test passed.");
  } finally {
    await cleanup(tutorialId);
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
