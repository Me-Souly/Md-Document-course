const TokenRepository = require('./token-repository.js');
const TokenModel = require('../../models/mongo/token-model.js');

class MongoTokenRepository extends TokenRepository {
    async findById(userId) {
        return TokenModel.findOne({userId});
    }

    async create(userAndTokenObj) {
        return TokenModel.create(userAndTokenObj); 
    }

    async deleteRefreshToken(refreshToken) {
        return TokenModel.deleteOne({refreshToken});
    }

    async findRefreshToken(refreshToken) {
        return TokenModel.findOne({refreshToken})
    }
}

module.exports = new MongoTokenRepository();
