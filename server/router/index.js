const Router = require('express').Router;
const userController = require('../controllers/user-controller');
const router = new Router();
const {body} = require('express-validator');
const authMiddleware = require('../middlewares/auth-middleware');

router.post('/registration', 
    body('email', 'Email is incorrect').isEmail(),
    body('username', 'Minimal username length is 2').isLength({min: 2}),
    body('password', 'Password length should be between 3 and 32').isLength({min: 3, max: 32}),
    userController.registration);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/activate/:link', userController.activate);
router.get('/refresh', userController.refresh);
router.get('/users', authMiddleware, userController.getUsers);

module.exports = router;
