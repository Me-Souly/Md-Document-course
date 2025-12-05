import { Router } from 'express';
import { body } from 'express-validator';
import {
    authMiddleware,
    moderatorMiddleware,
    activatedMiddleware,
    checkUserActive
} from '../middlewares/index.js';

import {
    userController,
    authController,
    activationController,
    passwordController,
    folderController,
    noteController,
    noteAccessController,
    commentController
} from '../controllers/index.js';
import { getNotePresence } from '../yjs/yjs-server.js';

const router = Router();

//
//  auth
//
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

//
//  activation
//
router.get('/activate/:token', activationController.activate);
router.post('/activation/resend', 
    authMiddleware,
    checkUserActive,
    activationController.resendActivation);

//
//  user control
//
router.post('/users/registration', 
    body('email', 'Email is incorrect').isEmail(),
    body('username', 'Minimal username length is 2').isLength({min: 2}),
    body('password', 'Password length should be between 3 and 32').isLength({min: 3, max: 32}),
    userController.registration);

router.get('/users',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    userController.getUsers);

router.get('/users/:identifier',
    userController.getUserByIdentifier);

router.patch('/users/me',
    authMiddleware,
    checkUserActive,
    userController.updateUser);

router.delete('/users/me',
    authMiddleware,
    checkUserActive,
    userController.deleteUser);

//
//  password 
//
router.post("/password/change",
    authMiddleware,
    checkUserActive,
    passwordController.changePassword);

router.post('/password/request-reset', 
    body('email', 'Email is incorrect').isEmail(),
    passwordController.requestReset);

router.get('/password/reset/:token', passwordController.validateReset);
router.post('/password/reset', passwordController.resetPassword);

//
//  folders
//
router.get('/folders', 
    authMiddleware,
    checkUserActive,
    folderController.getAll);
router.get('/folders/:id', 
    authMiddleware,
    checkUserActive,
    folderController.getById);
router.post('/folders', 
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.create);
router.put('/folders/:id', 
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.update);
router.delete('/folders/:id', 
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    folderController.delete);

//
//  notes
//
router.get('/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.getUserNotes);
router.get('/notes/shared', 
    authMiddleware, 
    checkUserActive, 
    noteController.getSharedNotes);
router.get('/notes/public', noteController.getAllPublicNotes);
router.get('/notes/:id', 
    authMiddleware, 
    checkUserActive, 
    noteController.getById);
router.post('/notes', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteController.create);
router.put('/notes/:id', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteController.update);
router.delete('/notes/:id', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteController.delete);
router.patch('/notes/:id/restore', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteController.restore);

router.get('/folders/:id/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.getNotesInFolder);

// Presence по заметкам (кто сейчас подключен по WS к документу)
router.get('/notes/:id/presence',
    authMiddleware,
    checkUserActive,
    (req, res) => {
        const noteId = req.params.id;
        const userIds = getNotePresence(noteId);
        return res.json({ userIds });
    });

router.get('/search/notes', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteController.searchOwn);
router.get('/search/notes/public', noteController.searchPublic);

//
// notes access (прямое управление доступом)
//
router.post('/notes/:id/access', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.addAccess);
router.get('/notes/:id/access', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.getAccessList);
router.patch('/notes/:id/access/:userId', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.updateAccess);
router.delete('/notes/:id/access/:userId', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.removeAccess);

//
// share links (управление share-ссылками)
//
router.post('/notes/:id/share-link', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.createShareLink);
router.get('/notes/:id/share-links', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.getShareLinks);
router.post('/share-link/connect', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.connectByShareLink);
router.get('/share-link/:token/info', 
    noteAccessController.getShareLinkInfo);
router.delete('/share-link/:token', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware,
    noteAccessController.deleteShareLink); 

//
//  comments
//
router.get('/notes/:noteId/comments',
    authMiddleware,
    checkUserActive,
    commentController.getByNote);

router.post('/notes/:noteId/comments',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    body('content', 'Comment cannot be empty').isLength({ min: 1 }),
    commentController.create);

router.delete('/comments/:commentId',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    commentController.delete);

router.post('/comments/:commentId/react',
    authMiddleware,
    checkUserActive,
    activatedMiddleware,
    body('type', 'Invalid reaction type').isIn(['like', 'dislike', 'heart', 'laugh', 'sad', 'angry']),
    commentController.react);

//
//  moderator
//
router.get('/moderator/public-notes',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.getModeratorPublicNotes);

router.delete('/moderator/notes/:id',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.deleteNoteAsModerator);

router.post('/moderator/notes/:id/block',
    authMiddleware,
    checkUserActive,
    moderatorMiddleware,
    noteController.blockNoteAsModerator);

export default router;