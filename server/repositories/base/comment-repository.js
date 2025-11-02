const BaseRepository = require('./base-repository');

class CommentRepository extends BaseRepository {
  async getCommentsByNote(noteId) { throw new Error('Not implemented'); }
  async getReplies(parentId) { throw new Error('Not implemented'); }
  async toggleReaction(commentId, userId, reactionType) { throw new Error('Not implemented'); }
}

module.exports = CommentRepository;
