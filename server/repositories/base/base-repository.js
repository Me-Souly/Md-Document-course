class BaseRepository {
  async findOneBy(filter) { throw new Error('Not implemented'); }
  async findBy(filter) { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async updateByIdAtomic(id, updateData, options) { throw new Error('Not implemented'); }
  async updateOneAtomic(filter, updateData, options) { throw new Error('Not implemented'); }
  async upsertOneAtomic(filter, data, options) { throw new Error('Not implemented'); }
  async save(entity) { throw new Error('Not implemented'); }
  async softDelete(id) { throw new Error('Not implemented'); }
  async findAll() { throw new Error('Not implemented'); }
  async deleteById(id) { throw new Error('Not implemented'); }
  async deleteOne(filter) { throw new Error('Not implemented'); }
  async deleteMany(filter) { throw new Error('Not implemented'); }
  async count(filter) { throw new Error('Not implemented'); }
}

module.exports = BaseRepository;