export const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err?.message || err);

  if (err?.name === 'ValidationError' && err?.errors) {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: 'Validation failed', details: messages });
  }

  if (err?.code === 11000 && err?.keyPattern) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({ error: `Duplicate value for ${field}` });
  }

  if (err?.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  const statusCode = err?.statusCode || err?.status || 500;
  const message = (statusCode >= 400 && statusCode < 500) ? (err?.message || 'Bad request') : 'Internal server error';

  res.status(statusCode).json({ error: message });
};

export const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};
