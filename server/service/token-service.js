const jwt = require('jsonwebtoken');
const TokenRepository = require('../repositories/mongo/mongo-token-repository');

const EXPIRES = {
  refresh: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
  reset: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES) * 60 * 1000,
  activation: parseInt(process.env.ACTIVATION_TOKEN_EXPIRES_HOURS) * 60 * 60 * 1000
};

class TokenService {
    generateTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {expiresIn: '30m'});
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {expiresIn: '45d'});
        
        return {
            accessToken,
            refreshToken
        }
    }

    validateAccessToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            return userData;
        } catch (e) {
            return null;
        }
    }

    validateRefreshToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
            return userData;
        } catch (e) {
            return null;
        }
    }

    // only for one device - one user
    async saveToken(userId, token, type = 'refresh') {
        const tokenData = await TokenRepository.findOneBy({ userId });
        if(tokenData) {
            tokenData.token = token;
            return tokenData.save();
        }
        const resultToken = await TokenRepository.create({
            userId, 
            token,
            type,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + EXPIRES[type])
        });
        return resultToken;
    }

    async removeToken(token) {
        const tokenData = await TokenRepository.deleteToken(token)
        return tokenData;
    }

    async findToken(refreshToken) {
        const tokenData = await TokenRepository.findRefreshToken(refreshToken)
        return tokenData;
    }
}

module.exports = new TokenService();