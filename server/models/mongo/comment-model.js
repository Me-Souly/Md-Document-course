const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // для reply
  content: { type: String, required: true },
  reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  isDeleted: { type: Boolean, default: false }
});
CommentSchema.index({ noteId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);