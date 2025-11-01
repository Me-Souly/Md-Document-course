const ApiError = require("../exceptions/api-error");
const { noteRepository } = require("../repositories");
const NoteDto = require("../dtos/note-dto");

class NoteService {
    async getById(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFound("Note not found");
        return new NoteDto(note, userId);
    }

    async create(userId, noteData) {
        const data = {
            ownerId: userId,
            ...noteData
        };

        const created = await noteRepository.create(data);
        return new NoteDto(created, userId);
    }

    async update(noteId, userId, data) {
        const updated = await noteRepository.updateByIdAtomic(noteId, data);
        if (!updated) throw ApiError.NotFound("Note not found");
        return new NoteDto(updated, userId);
    }

    async softDelete(noteId, userId) {
        const note = await noteRepository.softDelete(noteId);
        if (!note) throw ApiError.NotFound("Note not found");
        return new NoteDto(note, userId);
    }

    async delete(noteId) {
        return await noteRepository.delete(noteId);
    }

    async restore(noteId, userId) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFound("Note not found");

        if (note.ownerId !== userId) {
            throw ApiError.Forbidden("You cannot restore this note");
        }

        if (!note.isDeleted) {
            throw ApiError.BadRequest("Note is not marked as deleted");
        }

        const restoredNote = await noteRepository.updateByIdAtomic(noteId, {
            isDeleted: false,
            deletedAt: null
        });

        return new NoteDto(restoredNote, userId);
    }

    async getDeletedNotes(userId) {
        const notes = await noteRepository.findDeletedByUser(userId);
        return notes.map(note => new NoteDto(note, userId));
    }

    async getUserNotes(userId) {
        const notes = await noteRepository.findBy({
            ownerId: userId,
            isDeleted: false
        });
        return notes.map(note => new NoteDto(note, userId));
    }

    async getNotesInFolder(folderId, userId) {
        const notes = await noteRepository.findBy({
            folderId,
            isDeleted: false
        });
        return notes.map(note => new NoteDto(note, userId));
    }

    async getAllPublicNotes(userId = null) {
        const notes = await noteRepository.findBy({ isPublic: true });
        return notes.map(note => new NoteDto(note, userId || note.ownerId));
    }

    async getSharedWithUser(userId) {
        const notes = await noteRepository.findSharedWithUser({ userId });
        return notes.map(note => new NoteDto(note, userId));
    }

    async searchOwnNotes(userId, query) {
        const notes = await noteRepository.searchOwnNotes(userId, query);
        return notes.map(note => new NoteDto(note, userId));
    }

    async searchPublicNotes(query, userId = null) {
        const notes = await noteRepository.searchPublicNotes(query);
        return notes.map(note => new NoteDto(note, userId || note.ownerId));
    }
}

module.exports = new NoteService();
