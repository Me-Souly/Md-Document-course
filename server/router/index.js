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
    folderController.getAll);
router.get('/folders/:id', 
    authMiddleware,
    folderController.getById);
router.post('/folders', 
    authMiddleware,    
    folderController.create);
router.put('/folders/:id', 
    authMiddleware,
    folderController.update);
router.delete('/folders/:id', 
    authMiddleware,
    folderController.delete);

//
//  notes
//
router.get('/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.getUserNotes);
router.get('/notes/:id', 
    authMiddleware, 
    checkUserActive, 
    noteController.getById);
router.post('/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.create);
router.put('/notes/:id', 
    authMiddleware, 
    checkUserActive, 
    noteController.update);
router.delete('/notes/:id', 
    authMiddleware, 
    checkUserActive, 
    noteController.delete);
router.patch('/notes/:id/restore', 
    authMiddleware, 
    checkUserActive, 
    noteController.restore);

router.get('/folders/:id/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.getNotesInFolder);

router.get('/notes/public', noteController.getAllPublicNotes);

router.get('/search/notes', 
    authMiddleware, 
    checkUserActive, 
    noteController.searchOwn);
router.get('/search/notes/public', noteController.searchPublic);

//
// notes access (прямое управление доступом)
//
router.post('/notes/:id/access', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.addAccess);
router.get('/notes/:id/access', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.getAccessList);
router.patch('/notes/:id/access/:userId', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.updateAccess);
router.delete('/notes/:id/access/:userId', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.removeAccess);

router.post('/notes/:id/share-link', 
    authMiddleware, 
    checkUserActive, 
    noteAccessController.createShareLink);
// add connect by share-link later 

//
//  comments
//
router.get('/notes/:noteId/comments',
    authMiddleware,
    // checkUserActive,
    commentController.getByNote);

router.post('/notes/:noteId/comments',
    authMiddleware,
    // checkUserActive,
    body('content', 'Comment cannot be empty').isLength({ min: 1 }),
    commentController.create);

router.delete('/comments/:commentId',
    authMiddleware,
    // checkUserActive,
    commentController.delete);

router.post('/comments/:commentId/react',
    authMiddleware,
    // checkUserActive,
    body('type', 'Invalid reaction type').isIn(['like', 'dislike', 'heart', 'laugh', 'sad', 'angry']),
    commentController.react);
export default router;