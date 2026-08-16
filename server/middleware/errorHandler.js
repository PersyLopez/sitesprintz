export function errorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);

    // If headers have already been sent, delegate to the default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    const response = {
        success: false,
        error: message
    };

    // Only include stack traces if explicitly enabled via env var (never expose in production)
    const exposeDetails = process.env.NODE_ENV === 'development' && process.env.EXPOSE_ERROR_DETAILS === 'true';
    if (exposeDetails) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
}
