import BaseRepository from './base-repository.js';

class FolderRepository extends BaseRepository {
  async findByNote(noteId) { throw new Error('Not implemented'); }
  async findByParent(parentId) { throw new Error('Not implemented'); }
}

export default FolderRepository;
