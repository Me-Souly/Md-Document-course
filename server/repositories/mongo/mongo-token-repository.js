const TokenModel = require('../../models/mongo/token-model.js');
const TokenRepository = require('../token-repository.js');
const MongoBaseRepository = require('./mongo-base-repository.js');

class MongoTokenRepository extends TokenRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(TokenModel);
    }
    
    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    // async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    // async save(entity) { return this.mongo.save(entity); }
    // async softDelete(id) { return this.mongo.softDelete(id); }


    async findRefreshToken(refreshToken) {
        return await TokenModel.findOne({
            refreshToken,
            type: 'refresh'
        });
    }

    async deleteToken(token) {
        return TokenModel.deleteOne({token});
    }

    async deleteExpiredTokens() { 
        const now = new Date();
        const result = await TokenModel.deleteMany({ expiresAt: { $lt: now } });
        return result.deletedCount;
    }
}

module.exports = new MongoTokenRepository();
