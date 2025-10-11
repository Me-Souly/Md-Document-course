const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mailService = require('./mail-service');
const tokenService = require('./token-service');
const UserDto = require('../dtos/user-dto');
const ApiError = require('../exceptions/api-error');
const userRepository = require('../repositories/user/mongo-user-repository');

class UserService {
    async registration(email, username, password) {  
        const candidateByEmail = await userRepository.findByEmail(email);
        const candidateByUsername = await userRepository.findByUsername(username);
        if (candidateByEmail !== null) {
            throw ApiError.BadRequest(`User with email ${email} already exists`);
        }
        if (candidateByUsername !== null) {
            throw ApiError.BadRequest(`User with username ${username} already exists`);
        }

        const hashPassword = await bcrypt.hash(password, 3);
        const activationLink = uuid.v4();
        const user = await userRepository.create({email, username, password: hashPassword, activationLink});
        await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`);
        
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});
        await tokenService.saveToken(userDto.id, tokens.refreshToken);

        return {
            ...tokens,
            user: userDto
        }

    }

    async activate(activationLink) {
        const user = await userRepository.findByActivationLink(activationLink);
        if(!user) {
            throw ApiError.BadRequest('Некорректная строка активации');
        }

        user.isActivated = true;
        await user.save();
    }

    async login(identifier, password) {
        const emailRegex = new RegExp(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
        const isEmail = emailRegex.test(identifier);
        
        const user = isEmail
            ? await userRepository.findByEmail(identifier)
            : await userRepository.findByUsername(identifier);        

        if (!user && isEmail) {
            throw ApiError.BadRequest('User with that email isn\'t find');
        } else if (!user && !isEmail) {
            throw ApiError.BadRequest('User with that username isn\'t find');
        }

        const isPassEquals = await bcrypt.compare(password, user.password);
        if(!isPassEquals) {
            throw ApiError.BadRequest('Incorrect password');
        }
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});
        
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    async logout(refreshToken) {
        const token = await tokenService.removeToken(refreshToken);
        return token;
    }

    async refresh(refreshToken) {
        if(!refreshToken) {
            throw ApiError.UnauthorizedError();
        }
        const userData = tokenService.validateRefreshToken(refreshToken);
        const tokenFromDb = await tokenService.findToken(refreshToken);
        if(!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }
        const user = await userRepository.findById(userData.id);
        const userDto = new UserDto(user);
        const tokens = tokenService.generateTokens({...userDto});

        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    async getAllUsers() {
        const users = await userRepository.findAll();
        return users;
    }
}

module.exports = new UserService();