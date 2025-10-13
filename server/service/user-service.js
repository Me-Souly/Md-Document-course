const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mailService = require('./mail-service');
const tokenService = require('./token-service');
const UserDto = require('../dtos/user-dto');
const ApiError = require('../exceptions/api-error');
const { userRepository, roleRepository } = require('../repositories')

class UserService {
    async registration(email, login, password) {  
        const candidateByEmail = await userRepository.findOneBy({email_lower: email.toLowerCase()});
        const candidateByUsername = await userRepository.findOneBy({login: login.toLowerCase()});
        if (candidateByEmail !== null) {
            throw ApiError.BadRequest(`User with email ${email} already exists`);
        }
        if (candidateByUsername !== null) {
            throw ApiError.BadRequest(`User with login ${login} already exists`);
        }

        const hashPassword = await bcrypt.hash(password, 3);
        const role = await roleRepository.findOneBy({ name: "user" });
        
        const activationToken = uuid.v4();
        const user = await userRepository.create({
            email,
            email_lower: email.toLowerCase(), 
            login: login.toLowerCase(), 
            passwordHash: hashPassword,
            name: login,
            roleId: role._id
        });
        
        
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({...userDto});
        
        await tokenService.saveToken(userDto.id, activationToken, 'activation');
        await tokenService.saveToken(userDto.id, tokens.refreshToken, 'refresh');

        mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationToken}`)
            .catch(err => console.error('Ошибка отправки письма', err));

        return {
            ...tokens,
            user: userDto
        }

    }

    async activate(tokenString) {
        const token = await tokenService.validateActivationToken(tokenString);
        const user = await userRepository.findById(token.userId);
        
        if(!user) {
            throw ApiError.BadRequest('Incorrect activation string');
        }

        user.isActivated = true;
        await user.save();
        
        await tokenService.removeToken(token.token);
    }

    async login(identifier, password) {
        const emailRegex = new RegExp(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
        const isEmail = emailRegex.test(identifier.toLowerCase());

        const user = isEmail
            ? await userRepository.findOneBy({email_lower: identifier.toLowerCase()})
            : await userRepository.findOneBy({login: identifier.toLowerCase()});    

        if (!user && isEmail) {
            throw ApiError.BadRequest('User with that email isn\'t find');
        } else if (!user && !isEmail) {
            throw ApiError.BadRequest('User with that username isn\'t find');
        }

        const isPassEquals = await bcrypt.compare(password, user.passwordHash);
        if(!isPassEquals) {
            throw ApiError.BadRequest('Incorrect password');
        }
        const role = await roleRepository.findById(user.roleId);
        user.roleId = role;
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({...userDto});
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
        const tokenFromDb = await tokenService.findRefreshToken(refreshToken);
        if(!userData || !tokenFromDb) {
            throw ApiError.UnauthorizedError();
        }

        const user = await userRepository.findById(userData.id);
        const userDto = new UserDto(user);
        const tokens = tokenService.generateSessionTokens({...userDto});
        await tokenService.saveToken(userDto.id, tokens.refreshToken);
        return {...tokens, user: userDto}
    }

    async getAllUsers() {
        const users = await userRepository.findAll();
        return users;
    }
}

module.exports = new UserService();