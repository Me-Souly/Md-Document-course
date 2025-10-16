const UserRepository = require('./user-repository');
const TokenRepository = require('./token-repository');
const TagRepository = require('./tag-repository');
const RoleRepository = require('./role-repository');
const NoteRepository = require('./note-repository');
const CommentRepository = require('./comment-repository');
const BaseRepository = require('./base-repository');

module.exports = {
    BaseRepository,
    CommentRepository,
    NoteRepository,
    RoleRepository,
    TagRepository,
    TokenRepository,
    UserRepository
};