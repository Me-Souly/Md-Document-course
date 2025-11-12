import { sharedLinkService } from '../services/index.js';

class NoteAccessController {
    // POST /api/notes/:id/access
    async addAccess(req, res, next) {
        try {
            const { id } = req.params;
            const { userId, permission } = req.body;
            const grantedBy = req.user.id;

            const note = await sharedLinkService.updateAccess(id, { userId, permission }, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // PATCH /api/notes/:id/access/:userId
    async updateAccess(req, res, next) {
        try {
            const { id, userId } = req.params;
            const { permission } = req.body;
            const grantedBy = req.user.id;

            const note = await sharedLinkService.updateAccess(id, { userId, permission }, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }
    
    // DELETE /api/notes/:id/access/:userId
    async removeAccess(req, res, next) {
        try {
            const { id, userId } = req.params;
            const grantedBy = req.user.id;

            const note = await sharedLinkService.removeAccess(id, userId, grantedBy);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // POST /api/notes/:id/share-link
    async createShareLink(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const link = await sharedLinkService.createShareLink(id, userId);            
            return res.json(link);
        } catch (e) {
            next(e);
        }
    }
}

export default new NoteAccessController();