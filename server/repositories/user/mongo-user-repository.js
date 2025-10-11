const UserRepository = require('./user-repository');
const UserModel = require('../../models/mongo/user-model');

class MongoUserRepository extends UserRepository {
    async findByEmail(email) {
        return UserModel.findOne({ email });
    }

    async findByUsername(username) {
        return UserModel.findOne({ username });
    }

    async findById(id) {
        return UserModel.findById(id);
    }

    async findByActivationLink(activationLink) {
        return UserModel.findOne({activationLink});
    }

    async create(userData) {
        return UserModel.create(userData); 
    }

    async findAll() {
        return UserModel.find();
    }

    async save(user) {
        return user.save();
    }
}

module.exports = new MongoUserRepository();
