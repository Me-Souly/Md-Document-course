const BaseRepository = require("../base/base-repository");

class MongoBaseRepository extends BaseRepository{
  constructor(model) {
    super();
    this.model = model;
  }

  async findOneBy(filter) {
    return this.model.findOne({ ...filter });
  }

  async findBy(filter = {}) {
    return this.model.find({ ...filter });
  }

  async findById(id) {
    return this.model.findById(id);
  }

  async create(data) {
    return this.model.create(data);
  }

  async save(entity) {
    return entity.save();
  }

  async softDelete(id) {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    return doc;
  }
}

module.exports = MongoBaseRepository;
