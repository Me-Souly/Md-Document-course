import BaseRepository from './base-repository.js';

class CommentRepository extends BaseRepository {
  async getCommentsByNote(noteId) { throw new Error('Not implemented'); }
  async getReplies(parentId) { throw new Error('Not implemented'); }
  async toggleReaction(commentId, userId, reactionType) { throw new Error('Not implemented'); }
}

export default CommentRepository;
