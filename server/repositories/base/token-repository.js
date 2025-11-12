import BaseRepository from './base-repository.js';

class TokenRepository extends BaseRepository {
    async findRefreshToken(refreshToken) { throw new Error('Not implemented') }
    async findResetToken(resetToken) { throw new Error('Not implemented') }
    async findActivationToken(activationToken) { throw new Error('Not implemented') }
    async deleteToken(token) { throw new Error('Not implemented') }
    async removeTokensByUserId(userId) { throw new Error('Not implemented') }
    async deleteExpiredTokens() { throw new Error('Not implemented'); }
    async saveTokenAtomic(userId, token, type, expiresAt) { throw new Error('Not implemented'); }
}

export default TokenRepository;