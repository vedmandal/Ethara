/**
 * Global Error Handler
 */

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(`${field} already exists`, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }

  // Multer upload errors
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Max upload size is 25MB.', 400);
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Something went wrong';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
