const BaseRepository = require('./base-repository');

class FolderRepository extends BaseRepository {
  async findByNote(noteId) { throw new Error('Not implemented'); }
  async findByParent(parentId) { throw new Error('Not implemented'); }
}

module.exports = FolderRepository;
