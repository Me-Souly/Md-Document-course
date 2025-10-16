const { validationResult } = require("express-validator");
const { passwordService } = require("../services");
const ApiError = require("../exceptions/api-error");

class PasswordController {
    async requestReset(req, res, next) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return next(ApiError.BadRequest('Error while validation', errors.array()))
            }
            const { email } = req.body;
            const token = await passwordService.requestReset(email);
            return res.json({ message: 'Reset email sent successfully' });;
        } catch (e) {
            next(e);
        }
    }

    async reset(req, res, next) {
        try {
            const { email } = req.body;
            await passwordService.requestReset(email).then(res=> console.log(res));
            return res.redirect(process.env.CLIENT_URL);
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new PasswordController();