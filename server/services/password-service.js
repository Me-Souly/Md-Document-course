const uuid = require('uuid');
const bcrypt = require('bcrypt');
const ApiError = require("../exceptions/api-error");
const mailService = require("./mail-service");
const tokenService = require("./token-service");
const userService = require("./user-service");

class PasswordService {
    async requestReset(email) {
        const user = await userService.findOneBy({ email_lower: email.toLowerCase() })
        if (!user) throw ApiError.BadRequest(`User with email ${email} is not found`);

        const resetToken = uuid.v4();

        const token = await tokenService.saveToken(
            user.id,
            resetToken,
            'reset'
        );

        // отправляем письмо
        const resetLink = `${process.env.API_URL}/api/reset/${resetToken}`;
        mailService.sendResetMail(email, resetLink)
            .catch(err => console.error('Error occured while send mail', err));

        return token;
    }
    
    async reset() {
        
    }
}

module.exports = new PasswordService();