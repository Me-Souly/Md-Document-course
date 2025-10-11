const jwt = require('jsonwebtoken');
const TokenRepository = require('../repositories/token/mongo-token-repository');

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
    async saveToken(userId, refreshToken) {
        const tokenData = await TokenRepository.findById(userId);
        if(tokenData) {
            tokenData.refreshToken = refreshToken;
            return tokenData.save();
        }
        const token = await TokenRepository.create({user:userId, refreshToken});
        return token;
    }

    async removeToken(refreshToken) {
        const tokenData = await TokenRepository.deleteRefreshToken(refreshToken)
        return tokenData;
    }

    async findToken(refreshToken) {
        const tokenData = await TokenRepository.findRefreshToken(refreshToken)
        return tokenData;
    }
}

module.exports = new TokenService();