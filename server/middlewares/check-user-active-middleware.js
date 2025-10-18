const { userRepository } = require('../repositories');
const ApiError = require("../exceptions/api-error");

module.exports = async function(req, res, next) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return next(ApiError.UnauthorizedError());
        }

        const user = await userRepository.findById(userId);
        if (!user) {
            return next(ApiError.UnauthorizedError());
        }

        if (user.isDeleted) {
            return next(ApiError.ForbiddenError('Account has been deleted'));
        }

        next();
    } catch (e) {
        throw ApiError.BadRequest();
    }
}