import BaseRepository from './base-repository.js';

class TagRepository extends BaseRepository {
  async findByName(name) { throw new Error('Not implemented'); }
}

export default TagRepository;