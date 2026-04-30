// middleware/errorMiddleware.js

/**
 * notFound
 * Catches any request that didn't match a route and turns it into a
 * proper 404 JSON response instead of Express's default HTML page.
 *
 * FIX: Without this, unmatched routes returned an HTML error page,
 *      which would break any frontend code trying to parse JSON.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not found — ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * errorHandler
 * Global catch-all error handler.
 * Always returns JSON so the frontend can reliably parse the error message.
 *
 * FIX: Without a global handler, unhandled errors would leak full stack
 *      traces to the client in production — a security risk.
 */
const errorHandler = (err, req, res, next) => {
  // Express sometimes passes a 200 status even for errors; normalise to 500.
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    // Only expose the stack trace during development
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
