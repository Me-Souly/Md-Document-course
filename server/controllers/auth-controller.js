import { authService } from '../services/index.js';

class AuthController {
    // POST /api/login
    async login(req, res, next) {
        try {
            const { identifier, password } = req.body;
            const userData = await authService.login(identifier, password);
            res.cookie('refreshToken', userData.refreshToken, { maxAge: process.env.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000, httpOnly: true });

            return res.json(userData);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/logout
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

    // Post /api/refresh
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

export default new AuthController();