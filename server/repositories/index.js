const mongoRepositories = require('./mongo');
// const postgresRepositories = require('./postgres');

module.exports = {
    ...mongoRepositories,
};
