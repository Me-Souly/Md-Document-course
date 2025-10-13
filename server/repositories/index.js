const UserRepository = require('./mongo/mongo-user-repository');
const RoleRepository = require('./mongo/mongo-role-repository');
const TokenRepository = require('./mongo/mongo-token-repository');
const TagRepository = require('./mongo/mongo-tag-repository');
const NoteRepository = require('./mongo/mongo-note-repository');
const CommentRepository = require('./mongo/mongo-comment-repository');


module.exports = {
    userRepository: new UserRepository(),
    roleRepository: new RoleRepository(),
    tokenRepository: new TokenRepository(),
    tagRepository: new TagRepository(),
    noteRepository: new NoteRepository(),
    commentRepository: new CommentRepository()
};
