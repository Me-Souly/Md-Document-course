const UserRepository = require('./mongo-user-repository');
const RoleRepository = require('./mongo-role-repository');
const TokenRepository = require('./mongo-token-repository');
const TagRepository = require('./mongo-tag-repository');
const NoteRepository = require('./mongo-note-repository');
const CommentRepository = require('./mongo-comment-repository');

module.exports = {
    userRepository: new UserRepository(),
    roleRepository: new RoleRepository(),
    tokenRepository: new TokenRepository(),
    tagRepository: new TagRepository(),
    noteRepository: new NoteRepository(),
    commentRepository: new CommentRepository(),
};
