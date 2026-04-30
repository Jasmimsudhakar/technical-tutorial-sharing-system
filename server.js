// server.js
// Entry point for the Express API.

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./db");
const authRoutes = require("./authRoutes");
const tutorialRoutes = require("./tutorialRoutes");
const { notFound, errorHandler } = require("./errorMiddleware");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://127.0.0.1:5500,http://localhost:5500")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "Tech Tutorials Hub API is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/tutorials", tutorialRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const missingEnv = ["MONGO_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
    if (missingEnv.length) {
      throw new Error(
        `${missingEnv.join(", ")} ${missingEnv.length === 1 ? "is" : "are"} required. ` +
          "Copy .env.example to .env and fill in the missing values."
      );
    }

    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other server or set a different PORT.`);
        process.exit(1);
      }

      throw err;
    });
  } catch (err) {
    console.error(`Server startup failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();
