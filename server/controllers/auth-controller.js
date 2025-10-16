const { authService } = require('../services');

class AuthController {
        async login(req, res, next) {
        try {
            const {identifier, password} = req.body;
            const userData = await authService.login(identifier, password);
            res.cookie('refreshToken', userData.refreshToken, {maxAge: process.env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000, httpOnly: true});

            return res.json(userData);
        } catch (e) {
            next(e);
        }   
    }

    async logout(req, res, next) {
        try {
            const {refreshToken} = req.cookies;
            const token = await authService.logout(refreshToken);
            res.clearCookie('refreshToken');
            return res.json(token);
        } catch (e) {
            next(e);
        }   
    }

    async refresh(req, res, next) {
        try {
            const {refreshToken} = req.cookies;
            const userData = await authService.refresh(refreshToken);
            res.cookie('refreshToken', userData.refreshToken, {maxAge: process.env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000, httpOnly: true})
            return res.json(userData);
        } catch (e) {
            next(e);
        }   
    }
}

module.exports = new AuthController();