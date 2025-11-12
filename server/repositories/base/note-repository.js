import BaseRepository from './base-repository.js';

class NoteRepository extends BaseRepository {
  async incrementViews(noteId) { throw new Error('Not implemented'); }
  async delete(noteId) { throw new Error('Not implemented'); }
  async findDeletedByUser(ownerId) { throw new Error('Not implemented'); }
  async findSharedWithUser(userId) { throw new Error('Not implemented'); }
  async searchFuzzy(filter = {}, query = '', options = {}) { throw new Error('Not implemented'); }
  async search(filter, textQuery, options) { throw new Error('Not implemented'); }
}

export default NoteRepository;
