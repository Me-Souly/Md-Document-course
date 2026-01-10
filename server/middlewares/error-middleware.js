import ApiError from '../exceptions/api-error.js';

const errorMiddleware = function (err, req, res, next) {
    console.log(`Error middleware: ${err}`);

    // Handle our custom ApiError
    if (err instanceof ApiError) {
        return res.status(err.status).json({ message: err.message, errors: err.errors });
    }

    // Handle CSRF errors (from csrf-csrf library)
    if (err.code === 'EBADCSRFTOKEN' || err.message === 'invalid csrf token') {
        return res.status(403).json({ message: 'Invalid CSRF token. Please refresh the page and try again.' });
    }

    // Handle other errors with status codes
    if (err.status || err.statusCode) {
        const status = err.status || err.statusCode;
        return res.status(status).json({ message: err.message || 'Error' });
    }

    // Default 500 for unknown errors
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Unexpected server error' });
};

export default errorMiddleware;