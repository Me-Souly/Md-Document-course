import ApiError from '../exceptions/api-error.js';
import { noteRepository } from '../repositories/index.js';
import NoteDto from '../dtos/note-dto.js';
import { NoteModel } from '../models/mongo/index.js';

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

    async getNoteById(noteId) {
        const note = await noteRepository.findById(noteId);
        return note;
    }

    async saveYDocState(noteId, state) {
        try {
            console.log(`[NoteService] Сохранение YDocState для заметки ${noteId}, размер: ${state.length} байт`);
            
            // Убеждаемся, что это Buffer
            const buffer = Buffer.isBuffer(state) ? state : Buffer.from(state);
            
            // Извлекаем текст из ydocState для поиска
            let searchableContent = '';
            try {
                const Y = await import('yjs');
                const doc = new Y.Doc();
                Y.applyUpdate(doc, buffer);
                const text = doc.getText('content');
                searchableContent = text.toString();
                // Ограничиваем длину для индекса (MongoDB text index имеет ограничения)
                if (searchableContent.length > 10000) {
                    searchableContent = searchableContent.substring(0, 10000);
                }
            } catch (extractError) {
                console.warn(`[NoteService] Не удалось извлечь текст из ydocState:`, extractError.message);
            }
            
            // Используем прямой вызов модели для гарантии сохранения Buffer и searchableContent
            const result = await NoteModel.findByIdAndUpdate(
                noteId,
                { 
                    $set: { 
                        ydocState: buffer,
                        'meta.searchableContent': searchableContent
                    } 
                },
                { new: true }
            );
            
            if (!result) {
                console.error(`[NoteService] ✗ Заметка ${noteId} не найдена при сохранении`);
                return;
            }
            
            console.log(`[NoteService] ✓ YDocState сохранен в БД для заметки ${noteId}, размер: ${buffer.length} байт, текст: ${searchableContent.length} символов`);
        } catch (error) {
            console.error(`[NoteService] ✗ ОШИБКА при сохранении YDocState:`, error.message);
            // НЕ выбрасываем ошибку, чтобы не прерывать работу YJS
        }
    }
}

export default new NoteService();
