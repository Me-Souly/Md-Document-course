const { sharedLinkService } = require("../services");

class NoteAccessController {
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

module.exports = new NoteAccessController();