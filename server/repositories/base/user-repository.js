const BaseRepository = require("./base-repository");

class UserRepository extends BaseRepository {
    async findByActivationLink(activationLink) { throw new Error('Not implemented'); }
    async findAll() { throw new Error('Not implemented'); }
    async isFieldUnique(field, value, excludeUserId) { throw new Error('Not implemented'); }
}

module.exports = UserRepository;