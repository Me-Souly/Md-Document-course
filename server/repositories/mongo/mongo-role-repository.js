const { RoleModel } = require('../../models/mongo');
const { RoleRepository } = require('../base');
const MongoBaseRepository = require("./mongo-base-repository");

class MongoRoleRepository extends RoleRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(RoleModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }
    async updateByIdAtomic(id, updateData, options) { return this.mongo.updateByIdAtomic(id, updateData, options); }
    async updateOneAtomic(filter, updateData, options) { return this.mongo.updateOneAtomic(filter, updateData, options); }
    async upsertOneAtomic(filter, data, options) { return this.mongo.upsertOneAtomic(filter, data, options); }

    async findByName(name) {
        return RoleModel.findOne({ name });
    }

    async findAll() {
        return RoleModel.find();
    }
}

module.exports = MongoRoleRepository;