import { noteRepository, shareLinkRepository } from '../repositories/index.js';
import ApiError from '../exceptions/api-error.js';

class SharedLinkService {
    async updateAccess(noteId, accessEntry, grantedBy) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== grantedBy.toString()) {
            throw ApiError.ForbiddenError('Only owner can modify access');
        }

        const { userId, permission } = accessEntry;

        // если такой пользователь уже есть в access — обновим
        const existingAccess = note.access.find(a => a.userId.toString() === userId.toString());

        if (existingAccess) {
            existingAccess.permission = permission;
            existingAccess.grantedBy = grantedBy;
            existingAccess.createdAt = new Date();
        } else {
            note.access.push({
                userId,
                permission,
                grantedBy,
                createdAt: new Date()
            });
        }

        await noteRepository.updateByIdAtomic(noteId, { access: note.access });
        return await noteRepository.findById(noteId);
    }

    async removeAccess(noteId, userId, grantedBy) {
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== grantedBy.toString()) {
            throw ApiError.ForbiddenError('Only owner can modify access');
        }

        const filtered = note.access.filter(a => a.userId.toString() !== userId.toString());

        await noteRepository.updateByIdAtomic(noteId, { access: filtered });
        return await noteRepository.findById(noteId);
    }

    async createShareLink(noteId, userId) {
        // 1. Получаем заметку
        const note = await noteRepository.findById(noteId);
        if (!note) throw ApiError.NotFoundError('Note not found');

        if (note.ownerId.toString() !== userId.toString()) {
            throw ApiError.ForbiddenError('Only owner can share note');
        }

        // 2. Генерируем токен
        const shareToken = Buffer.from(`${noteId}:${Date.now()}`).toString('base64');

        // 3. Сохраняем токен в отдельную таблицу
        await shareLinkRepository.create({
            noteId,
            token: shareToken,
            createdBy: userId,
            createdAt: new Date(),
            expiresAt: null // можно добавить позже, если нужна одноразовая или временная ссылка
        });

        // 4. Возвращаем ссылку для клиента
        return { shareLink: `${process.env.CLIENT_URL}/share/${shareToken}` };
    }
}

export default new SharedLinkService();