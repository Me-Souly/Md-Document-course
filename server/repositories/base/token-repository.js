const BaseRepository = require("./base-repository");

class TokenRepository extends BaseRepository {
    async findRefreshToken(refreshToken) { throw new Error('Not implemented') }
    async findResetToken(resetToken) { throw new Error('Not implemented') }
    async findActivationToken(activationToken) { throw new Error('Not implemented') }
    async deleteToken(token) { throw new Error('Not implemented') }
    async deleteUserTokensById(userId) { throw new Error('Not implemented') }
    async deleteExpiredTokens() { throw new Error('Not implemented'); }
    async saveTokenAtomic(userId, token, type, expiresAt) { throw new Error('Not implemented'); }
}

module.exports = TokenRepository;