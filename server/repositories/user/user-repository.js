class UserRepository {
    async findByEmail(email) { throw new Error('Not implemented'); }
    async findByUsername(username) { throw new Error('Not implemented'); }
    async findById(id) { throw new Error('Not implemented'); }
    async findByActivationLink(activationLink) { throw new Error('Not implemented'); }
    async create(userData) { throw new Error('Not implemented'); }
    async findAll() { throw new Error('Not implemented'); }
    async save(user) { throw new Error('Not implemented'); }
}

module.exports = UserRepository;