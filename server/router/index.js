const Router = require('express').Router;
const router = new Router();
const {body} = require('express-validator');
const { authMiddleware, moderatorMiddleware, activatedMiddleware, checkUserActive } = require('../middlewares');

const { userController, authController, activationController, passwordController } = require('../controllers');

router.post('/registration', 
    body('email', 'Email is incorrect').isEmail(),
    body('username', 'Minimal username length is 2').isLength({min: 2}),
    body('password', 'Password length should be between 3 and 32').isLength({min: 3, max: 32}),
    userController.registration);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/refresh', authController.refresh);
router.get('/activate/:token', activationController.activate);
router.get('/users', 
    authMiddleware, 
    checkUserActive,
    activatedMiddleware, 
    userController.getUsers);
router.post('/update-user', authMiddleware, userController.updateUser);
router.post('/delete-account', authMiddleware, userController.deleteUser);


router.post('/request-reset', 
    body('email', 'Email is incorrect').isEmail(),
    passwordController.requestReset);
router.get('/reset/:token', passwordController.validateReset);
router.post('/reset-password', passwordController.resetPassword);
router.post("/change-password", authMiddleware, passwordController.changePassword);

module.exports = router;
