const UserRepository = require('./user-repository');
const TokenRepository = require('./token-repository');
const TagRepository = require('./tag-repository');
const RoleRepository = require('./role-repository');
const NoteRepository = require('./note-repository');
const CommentRepository = require('./comment-repository');
const FolderRepository = require('./folder-repository');
const BaseRepository = require('./base-repository');
const SharedLinkRepository = require('./shared-link-repository');

module.exports = {
    BaseRepository,
    CommentRepository,
    FolderRepository,
    NoteRepository,
    RoleRepository,
    TagRepository,
    TokenRepository,
    UserRepository,
    SharedLinkRepository
};