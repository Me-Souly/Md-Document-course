const { TokenModel } = require('../../models/mongo');
const { TokenRepository } = require('../base');
const MongoBaseRepository = require('./mongo-base-repository');

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
        return TokenModel.findOne({
            token: refreshToken,
            type: 'refresh'
        });
    }

    async findResetToken(resetToken) { 
        return TokenModel.findOne({
            token: resetToken,
            type: 'reset'
        });    
    }

    async findActivationToken(activationToken) { 
        return TokenModel.findOne({
            token: activationToken,
            type: 'activation'
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

    async saveTokenAtomic(userId, token, type, expiresAt) {
        const now = new Date();

        const tokenData = await TokenModel.findOneAndUpdate(
            { userId, type },                     // фильтр
            { token, createdAt: now, expiresAt }, // обновление
            { upsert: true, new: true }           // если нет — создаст, вернёт новый
        );

        return tokenData;
    }
}

module.exports = MongoTokenRepository;
