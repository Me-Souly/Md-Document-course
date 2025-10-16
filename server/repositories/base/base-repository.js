class BaseRepository {
  async findOneBy(filter) { throw new Error('Not implemented'); }
  async findBy(filter) { throw new Error('Not implemented'); }
  async findById(id) { throw new Error('Not implemented'); }
  async create(data) { throw new Error('Not implemented'); }
  async update(id, updateData) { throw new Error('Not implemented'); }
  async save(entity) { throw new Error('Not implemented'); }
  async softDelete(id) { throw new Error('Not implemented'); }
}

module.exports = BaseRepository;