const BaseRepository = require("./base-repository");

class RoleRepository extends BaseRepository {
  async findByName(name) { throw new Error('Not implemented'); }
}

module.exports = RoleRepository;