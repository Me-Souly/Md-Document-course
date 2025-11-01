// models/note.js
const { Schema, model } = require('mongoose');

const NoteSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },

  title: { type: String, default: '' },
  content: { type: String, default: '' },       // Markdown
  rendered: { type: String, default: '' },      // Кеш HTML-рендера
  
  parentId: { type: Schema.Types.ObjectId, ref: 'Note', default: null },
  folderId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },

  tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],

  isPublic: { type: Boolean, default: false },
  allowCopy: { type: Boolean, default: true },
  access: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['read','edit'], default: 'read' },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],

  maxEditors: { type: Number, default: 10 },
  
  version: { type: Number, default: 1 },
  
  meta: {
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
    excerpt: { type: String, default: '' }
  },
  
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Индексы
NoteSchema.index({ ownerId: 1, updatedAt: -1 });
NoteSchema.index({ isPublic: 1, updatedAt: -1 });
NoteSchema.index({ parentId: 1 });
NoteSchema.index({ title: 'text', content: 'text' });

NoteSchema.pre('save', function(next) {
  if (!this.meta.excerpt && this.content) {
    this.meta.excerpt = this.content.slice(0, 150) + '...';
  }
  next();
});

module.exports = model('Note', NoteSchema);
