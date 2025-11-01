const mongoose = require('mongoose');

const SharedLinkSchema = new mongoose.Schema({
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  token: { type: String, required: true, unique: true },
  permission: { type: String, enum: ['read', 'edit'], default: 'read' },
  expiresAt: { type: Date, default: null }, // null = бессрочно
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SharedLink', SharedLinkSchema);