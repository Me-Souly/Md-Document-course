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

    async getUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            return res.json(users);
        } catch (e) {
            next(e);
        }   
    }
    
    async updateUser(req, res, next) {
        try {
            const updateData = req.body;
            const userId = req.user.id;
            const userData = await userService.updateUser(userId, updateData);
            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    async deleteUser(req, res, next) {
        try {
            const { password } = req.body;
            const userId = req.user.id;

            await userService.deleteUser(userId, password);

            return res.json({ success: true, message: 'Account deleted successfully' });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new UserController();