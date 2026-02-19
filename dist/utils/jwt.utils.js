"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateRefreshToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = require("../config/env.config");
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_config_1.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};
exports.generateToken = generateToken;
const generateRefreshToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_config_1.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_config_1.env.JWT_SECRET);
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.utils.js.map