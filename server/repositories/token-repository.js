const BaseRepository = require("./base-repository");

class TokenRepository extends BaseRepository {
    async findRefreshToken(refreshToken) { throw new Error('Not implemented') }
    async deleteToken(token) { throw new Error('Not implemented') }
    async deleteExpiredTokens() { throw new Error('Not implemented'); }
}

module.exports = TokenRepository;