const uuid = require('uuid');
const ApiError = require('../exceptions/api-error');
const tokenService = require('./token-service');
const mailService = require('./mail-service');
const userService = require('./user-service');


class ActivationService {
    async createActivation(user) {
        if (!user?.email || !user?.id) {
            throw ApiError.BadRequest('Uncorrect User data');
        }

        const activationToken = uuid.v4();

        const token = await tokenService.saveToken(
            user.id,
            activationToken,
            'activation'
        );

        // отправляем письмо
        const activationLink = `${process.env.API_URL}/api/activate/${activationToken}`;
        mailService.sendActivationMail(user.email, activationLink)
            .catch(err => console.error('Error occured while send mail', err));
        

        return token;        
    }

    async activate(tokenString) {
        const token = await tokenService.validateLinkToken(tokenString, 'activation');

        const user = await userService.findById(token.userId);
        if (!user) throw ApiError.BadRequest('Incorrect activation string');

        user.isActivated = true;
        await user.save();
        
        await tokenService.removeToken(token.token);
    }
}

module.exports = new ActivationService();