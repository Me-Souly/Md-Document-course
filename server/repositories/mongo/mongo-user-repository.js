const { UserModel } = require('../../models/mongo');
const { UserRepository } = require('../base');
const MongoBaseRepository = require('./mongo-base-repository');

class MongoUserRepository extends UserRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(UserModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }

    async isFieldUnique(field, value, excludeUserId) {
        const filter = { [field]: value };
        if (excludeUserId) {
            filter._id = { $ne: excludeUserId };
        }
        const existing = await this.findOneBy(filter);
        return !existing;
    }

    async update(id, updateData) {
        const user = await UserModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );
        return user;
    }

    async findByActivationLink(activationLink) {
        return UserModel.findOne({activationLink});
    }

    async findAll() {
        return UserModel.find();
    }
}

module.exports = MongoUserRepository;
