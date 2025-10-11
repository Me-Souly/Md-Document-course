const RoleModel = require('../../models/mongo/role-model');
const MongoBaseRepository = require("./mongo-base-repository");
const RoleRepository = require('../role-repository');

class MongoRoleRepository extends RoleRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(RoleModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    // async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }

    async findByName(name) {
        return RoleModel.findOne({ name });
    }

    async findAll() {
        return RoleModel.find();
    }
}

module.exports = new MongoRoleRepository();