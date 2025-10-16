const { roleRepository } = require("../repositories");

class RoleService {
    async findOneBy(filter) {
        return await roleRepository.findOneBy(filter);
    }
}

module.exports = new RoleService();