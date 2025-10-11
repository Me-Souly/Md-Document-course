const BaseRepository = require('./base-repository');

class TagRepository extends BaseRepository {
  async findByName(name) { throw new Error('Not implemented'); }
}

module.exports = TagRepository;