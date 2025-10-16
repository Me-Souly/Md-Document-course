const ApiError = require("../exceptions/api-error")

module.exports = async function (req, res, next) {
    if(req.method === 'OPTIONS') {
        next();
    }

    try {
        const userData = req.user;
        if(!userData || userData.role !== 'moderator') {
            return next(ApiError.ForbiddenError());               
        }

        return next();
    } catch (e) {
        return next(ApiError.ForbiddenError());       
    }
}