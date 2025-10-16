const { NoteModel } = require("../../models/mongo");
const { NoteRepository } = require("../base");
const MongoBaseRepository = require("./mongo-base-repository");

class MongoNoteRepository extends NoteRepository {
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
    
    async incrementViews(noteId) {
        const updated = await NoteModel.findByIdAndUpdate(
            noteId,
            {
                $inc: { 'meta.views': 1 },
                $set: { 'meta.lastViewedAt': new Date() }
            },
            { new: true }
        );
        return updated;
  }
}

module.exports = MongoNoteRepository;