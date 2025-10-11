const NoteModel = require('../../models/mongo/note-model');
const CommentRepository = require("../comment-repository");
const MongoBaseRepository = require("./mongo-base-repository");

class MongoCommentRepository extends CommentRepository {
    constructor() {
        super();
        this.mongo = new MongoBaseRepository(NoteModel);
    }

    async findOneBy(filter) { return this.mongo.findOneBy(filter); }
    async findBy(filter) { return this.mongo.findBy(filter); }
    async findById(id) { return this.mongo.findById(id); }
    async create(data) { return this.mongo.create(data); }
    async save(entity) { return this.mongo.save(entity); }
    async softDelete(id) { return this.mongo.softDelete(id); }
    
    async findByNote(noteId) {
        return NoteModel.find({
            noteId,
            isDeleted: false
        });
    }
    async findByParent(parentId) {
        return NoteModel.find({
            parentId,
            isDeleted: false
        });
    }
}

module.exports = new MongoCommentRepository();