const jwt = require('jsonwebtoken');
const tokenRepository = require('../repositories/mongo/mongo-token-repository');
const ApiError = require('../exceptions/api-error');

const EXPIRES = {
  refresh: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) * 24 * 60 * 60 * 1000,
  reset: parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES) * 60 * 1000,
  activation: parseInt(process.env.ACTIVATION_TOKEN_EXPIRES_DAYS) * 24 * 60 * 60 * 1000
};

class TokenService {
    generateSessionTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES });

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

    async validateActivationToken(tokenString) {
        const token = await tokenRepository.findActivationToken(tokenString);
        
        if (!token) throw ApiError.BadRequest(`Token not found ${tokenString}`);
        
        if (token.expiresAt < new Date()) {
            await tokenRepository.deleteToken(token);
            throw ApiError.BadRequest('Link expired');
        }
        return token;
    }

    // only for one device - one user
    async saveToken(userId, token, type = 'refresh') {
        const tokenData = await tokenRepository.findOneBy({ userId, type });

        if (tokenData) {
            tokenData.token = token;
            tokenData.createdAt = new Date();
            tokenData.expiresAt = new Date(Date.now() + EXPIRES[type]);
            return tokenData.save();
        }

        const resultToken = await tokenRepository.create({
            userId,
            token,
            type,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + EXPIRES[type])
        });

        return resultToken;
    }


    async removeToken(token) {
        const tokenData = await tokenRepository.deleteToken(token)
        return tokenData;
    }

    async findRefreshToken(refreshToken) {
        const tokenData = await tokenRepository.findRefreshToken(refreshToken)
        return tokenData;
    }
}

module.exports = new TokenService();