const activationService = require('../services/activation-service');

class ActivationController {
    // GET api/activate/:token
    async activate(req, res, next) {
        try {
            const activationToken = req.params.token;
            await activationService.activate(activationToken);
            return res.redirect(process.env.CLIENT_URL)
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new ActivationController();