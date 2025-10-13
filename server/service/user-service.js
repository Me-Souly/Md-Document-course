const bcrypt = require('bcrypt');
const uuid = require('uuid');
const mailService = require('./mail-service');
const tokenService = require('./token-service');
const UserDto = require('../dtos/user-dto');
const ApiError = require('../exceptions/api-error');
const { userRepository, roleRepository } = require('../repositories')

class UserService {
    /**
 * Регистрация нового пользователя.
 *
 * Создаёт пользователя с указанным email, логином и паролем, 
 * хеширует пароль, присваивает стандартную роль, генерирует токены доступа и активации,
 * сохраняет их в базе и отправляет письмо с активацией.
 *
 * @async
 * @param {string} email - Email пользователя. Должен быть уникальным.
 * @param {string} login - Логин пользователя. Должен быть уникальным.
 * @param {string} password - Пароль пользователя в открытом виде.
 * @returns {Promise<Object>} Возвращает объект с данными пользователя и токенами:
 *  - user: {UserDto} DTO пользователя,
 *  - accessToken: {string} JWT для доступа,
 *  - refreshToken: {string} JWT для обновления сессии.
 *
 * @throws {ApiError.BadRequest} Если email или логин уже существует.
 * @throws {Error} При других ошибках при работе с базой или сервисами.
 *
 * @example
 * const userData = await userService.registration(
 *   "example@mail.com", 
 *   "myLogin", 
 *   "myPassword123"
 * );
 */
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
            .catch(err => console.error('Error occured while send mail', err));
        
        return {
            ...tokens,
            user: userDto
        }

    }

    /**
 * Активация аккаунта пользователя по токену.
 *
 * Находит токен активации в базе, проверяет его валидность и срок действия.
 * Если токен действителен, активирует пользователя, сохраняет изменения
 * и удаляет использованный токен.
 *
 * @async
 * @param {string} tokenString - Токен активации, отправленный пользователю по email.
 * @returns {Promise<void>} Не возвращает данных, завершает процесс активации.
 *
 * @throws {ApiError.BadRequest} Если токен недействителен, устарел или пользователь не найден.
 *
 * @example
 * try {
 *   await userService.activate("some-activation-token");
 *   console.log("Аккаунт успешно активирован");
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
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

    /**
 * Авторизация пользователя по логину/email и паролю.
 *
 * Определяет, является ли переданный идентификатор email или логином,
 * ищет пользователя в базе, проверяет совпадение пароля и генерирует
 * JWT-токены для сессии (access и refresh).
 * Также меняет идентификатор роли на её название.
 *
 * @async
 * @param {string} identifier - Email или логин пользователя.
 * @param {string} password - Пароль пользователя.
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: UserDto }>} 
 * Объект с токенами и DTO пользователя.
 *  - user: {UserDto} DTO пользователя,
 *  - accessToken: {string} JWT для доступа,
 *  - refreshToken: {string} JWT для обновления сессии.
 * @throws {ApiError.BadRequest} Если пользователь не найден или пароль неверен.
 *
 * @example
 * try {
 *   const userData = await userService.login("user@example.com", "mypassword");
 *   console.log(userData.accessToken);
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
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

    /**
 * Выход пользователя из системы.
 *
 * Удаляет указанный refresh-токен из базы данных, чтобы завершить сессию.
 *
 * @async
 * @param {string} refreshToken - Refresh-токен пользователя.
 * @returns {Promise<Object|null>} Возвращает объект удалённого токена или null, если токен не найден.
 *
 * @throws {ApiError} В случае проблем с удалением токена.
 *
 * @example
 * try {
 *   const result = await userService.logout(userRefreshToken);
 *   console.log("Токен удалён:", result);
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
    async logout(refreshToken) {
        const token = await tokenService.removeToken(refreshToken);
        return token;
    }

    /**
 * Обновление сессии пользователя.
 *
 * Валидирует переданный refresh-токен.
 * Достает из него информацию о пользователе. Ищет токен в базе данных.
 * Создаёт новые access и refresh токены
 * Сохраняет новый refresh-токен в базе данных и возвращает их вместе с данными пользователя.
 *
 * @async
 * @param {string} refreshToken - Текущий refresh-токен пользователя.
 * @returns {Promise<{accessToken: string, refreshToken: string, user: Object}>} 
 *          Возвращает объект с новым access-токеном, refresh-токеном и DTO пользователя.
 *
 * @throws {ApiError.UnauthorizedError} Если refresh-токен отсутствует, недействителен или не найден в базе данных.
 *
 * @example
 * try {
 *   const userData = await userService.refresh(req.cookies.refreshToken);
 *   console.log(userData.accessToken);
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
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

    /**
 * Получение списка всех пользователей.
 *
 * Выполняет выборку всех пользователей из базы данных.
 *
 * @async
 * @returns {Promise<Array<Object>>} Массив объектов пользователей (моделей или DTO).
 *
 * @throws {Error} В случае ошибки при запросе к базе данных.
 *
 * @example
 * try {
 *   const users = await userService.getAllUsers();
 *   console.log(users);
 * } catch (e) {
 *   console.error(e.message);
 * }
 */
    async getAllUsers() {
        const users = await userRepository.findAll();
        return users;
    }
}

module.exports = new UserService();