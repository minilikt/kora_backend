"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_utils_1 = require("../utils/jwt.utils");
const error_middleware_1 = require("./error.middleware");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new error_middleware_1.AppError('No token provided', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_utils_1.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        throw new error_middleware_1.AppError('Invalid or expired token', 401);
    }
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map