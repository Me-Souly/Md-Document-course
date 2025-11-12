import activationService from '../services/activation-service.js';

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

export default new ActivationController();