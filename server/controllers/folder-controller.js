const { folderService } = require('../services');

class FolderController {
    async getAll(req, res, next) {
        try {
            const folders = await folderService.getAllFolders(req.user.id);
            res.json(folders);
        } catch (e) {
            next(e);
        }
    }

    async getById(req, res, next) {
        try {
            const folder = await folderService.getFolderById(req.user.id, req.params.id);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    async create(req, res, next) {
        try {
            const folder = await folderService.createFolder(req.user.id, req.body);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    async update(req, res, next) {
        try {
            const folder = await folderService.updateFolder(req.user.id, req.params.id, req.body);
            res.json(folder);
        } catch (e) {
            next(e);
        }
    }

    async delete(req, res, next) {
        try {
            await folderService.deleteFolder(req.user.id, req.params.id);
            res.json({ success: true });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new FolderController();
