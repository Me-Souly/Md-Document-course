module.exports = {
    authMiddleware: require('./auth-middleware'),
    moderatorMiddleware: require('./moderator-middleware'),
    errorMiddleware: require('./error-middleware'),
    activatedMiddleware: require('./activated-middleware')
};