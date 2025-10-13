const TagModel = require("../../models/mongo/tag-model")
const TagRepository = require("../base/tag-repository");
const MongoBaseRepository = require("./mongo-base-repository");

class MongoTagRepository extends TagRepository{
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(TagModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    // async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }

    async findByName(name) {
        return TagModel.findOne({ name });
    }
}

module.exports = MongoTagRepository;