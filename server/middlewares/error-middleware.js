import ApiError from '../exceptions/api-error.js';

const errorMiddleware = function (err, req, res, next) {
    console.log(`Error middleware: ${err}`);

    if(err instanceof ApiError) {
        return res.status(err.status).json({message: err.message, errors: err.errors})
    }
    return res.status(500).json({message: 'Unexpected server error'});
};

export default errorMiddleware;