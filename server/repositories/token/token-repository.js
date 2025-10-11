class TokenRepository {
    async findById(id) { throw new Error('Not implemented'); }
    async create(userData) { throw new Error('Not implemented'); }
    async findRefreshToken(refreshToken) { throw new Error('Not implemented')}
    async deleteRefreshToken(refreshToken) {throw new Error('Not implemented')}
}

module.exports = TokenRepository;