class NoteDto {
  constructor(note, userId) {
    this.id = note._id;
    this.title = note.title;
    this.content = note.content;
    this.rendered = note.rendered;
    this.folderId = note.folderId;
    this.isPublic = note.isPublic;
    this.meta = note.meta;
    this.updatedAt = note.updatedAt;
    this.createdAt = note.createdAt;

    // определение доступа
    this.isOwner = note.ownerId === userId;
    const userAccess = note.access?.find(a => a.userId === userId);
    this.canEdit = this.isOwner || (userAccess && userAccess.permission === 'edit');

    // владелец видит, кому дал доступ
    if (this.isOwner && Array.isArray(note.access)) {
      this.access = note.access.map(a => ({
        userId: a.userId,
        permission: a.permission,
        grantedBy: a.grantedBy,
        createdAt: a.createdAt
      }));
    }
  }
}

module.exports = NoteDto;
