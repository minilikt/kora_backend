"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.findUserById = exports.findUserByEmail = exports.users = void 0;
// In-memory user storage (replace with database in production)
exports.users = [];
const findUserByEmail = (email) => {
    return exports.users.find((user) => user.email === email);
};
exports.findUserByEmail = findUserByEmail;
const findUserById = (id) => {
    return exports.users.find((user) => user.id === id);
};
exports.findUserById = findUserById;
const createUser = (user) => {
    exports.users.push(user);
    return user;
};
exports.createUser = createUser;
//# sourceMappingURL=user.model.js.map