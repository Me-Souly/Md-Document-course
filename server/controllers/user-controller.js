const { authService, userService, activationService, passwordService } = require('../services');
const { validationResult } = require('express-validator');
const ApiError = require('../exceptions/api-error');

class UserController {
    async registration(req, res, next) {
        try {
            const errors = validationResult(req);
            if(!errors.isEmpty()) {
                return next(ApiError.BadRequest('Error while validation', errors.array()))
            }
            const { email, username, password } = req.body;
            const userData = await userService.registration(email, username, password);
            await activationService.createActivation(userData.user);
            res.cookie('refreshToken', userData.refreshToken, {maxAge: process.env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000, httpOnly: true});

            return res.json(userData);
        } catch (e) {
            next(e);
        }   
    }

    async reset(req, res, next) {
        try {
            const resetToken = req.params.link;
            await passwordService.reset(resetToken);
            return res.redirect(process.env.CLIENT_URL);
        } catch (e) {
            next(e);
        }
    }

    async getUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            return res.json(users);
        } catch (e) {
            next(e);
        }   
    }
}

module.exports = new UserController();