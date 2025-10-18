const ApiError = require("../exceptions/api-error");

module.exports = function (req, res, next) {
    const userData = req.user;
    if(!userData) {
        return next(ApiError.UnauthorizedError());
    }

    try {
        if (!userData.isActivated) {
            return next(ApiError.ForbiddenError(`Аккаунт не активирован. Проверьте email. ${userData}`));
        }

        next();
    } catch (e) {
        return next(ApiError.ForbiddenError('Вероятно, аккаунт не активирован. Проверьте email.'))
    }
}