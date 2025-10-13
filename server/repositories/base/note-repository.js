const BaseRepository = require('./base-repository');

class NoteRepository extends BaseRepository {
  async incrementViews(noteId) { throw new Error('Not implemented'); }
}

module.exports = NoteRepository;
