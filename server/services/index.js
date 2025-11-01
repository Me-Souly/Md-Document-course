const userService = require('./user-service');
const authService = require('./auth-service');
const activationService = require('./activation-service');
const passwordService = require('./password-service');
const tokenService = require('./token-service');
const mailService = require('./mail-service');
const folderService = require('./folder-service');
const noteService = require('./note-service');
const sharedLinkService = require('./shared-link-service');
const commentService = require('./comment-service')

module.exports = {
    userService,
    authService,
    activationService,
    passwordService,
    tokenService,
    mailService,
    folderService,
    noteService,
    sharedLinkService,
    commentService,
};