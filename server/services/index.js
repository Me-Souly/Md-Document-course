const userService = require('./user-service');
const authService = require('./auth-service');
const activationService = require('./activation-service');
const passwordService = require('./password-service');
const tokenService = require('./token-service');
const mailService = require('./mail-service');

module.exports = {
    userService,
    authService,
    activationService,
    passwordService,
    tokenService,
    mailService
};