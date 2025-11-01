const { noteService } = require("../services");

class NoteController {
    async create(req, res, next) {
        try {
            const userId = req.user.id;
            const noteData = req.body;
            const note = await noteService.create(userId, noteData);
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    async update(req, res, next) {
        try {
            const note = await noteService.update(req.params.id, req.body); 
            return res.json(note);
        } catch (e) {
            next(e);
        }
    }

    // if isDelete=true - delete from db
    async delete(req, res, next) {
        try {
            const deletedNote = await noteService.delete(req.params.id);
            return res.json(deletedNote);
        } catch (e) {
            next(e);
        }
    }
    
    async restore(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const note = await noteService.restore(id, userId);

            return res.json({
                success: true,
                message: 'Note successfully restored',
                note
            });
        } catch (e) {
            next(e);
        }
    }

    async getById(req, res, next) {
        try {
            const note = await noteService.getById(req.params.id); 
            return res.json(note); 
        } catch (e) {
            next(e);
        }
    }
    
    async getUserNotes(req, res, next) {
        try {
            const userId = req.user.id;
            const notesList = await noteService.getUserNotes(userId);
            return res.json(notesList);
        } catch (e) {
            next(e);
        }
    }

    async getNotesInFolder(req, res, next) {
        try {
            const notes = await noteService.getNotesInFolder(req.params.id);
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    async getAllPublicNotes(req, res, next) {
        try {
            const notes = await noteService.getAllPublicNotes();
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    async getDeleted(req, res, next) {
        try {
            const userId = req.user.id;
            const notes = await noteService.getDeletedNotes(userId);
            return res.json(notes);
        } catch (e) {
            next(e);
        }
    }

    async searchOwn(req, res, next) {
        try {
            const userId = req.user.id;
            const query = req.query.query || '';

            const notes = await noteService.searchOwnNotes(userId, query);
            return res.json({ success: true, notes });
        } catch (e) {
            next(e);
        }
    }

    async searchPublic(req, res, next) {
        try {
            const query = req.query.query || '';
            const notes = await noteService.searchPublicNotes(query);
   
            return res.json({ success: true, notes });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = new NoteController();