const Router = require('express').Router;
const router = new Router();
const {body} = require('express-validator');
const { authMiddleware, moderatorMiddleware, activatedMiddleware } = require('../middlewares');

const { userController, authController, activationController, passwordController } = require('../controllers');

router.post('/registration', 
    body('email', 'Email is incorrect').isEmail(),
    body('username', 'Minimal username length is 2').isLength({min: 2}),
    body('password', 'Password length should be between 3 and 32').isLength({min: 3, max: 32}),
    userController.registration);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/activate/:link', activationController.activate);
router.get('/reset/:link', userController.reset);
router.get('/users', authMiddleware, activatedMiddleware, userController.getUsers);

router.post('/refresh', passwordController.reset);
router.post('/requestReset', 
    body('email', 'Email is incorrect').isEmail(),
    passwordController.requestReset);

module.exports = router;
