"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAccessToken = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const password_utils_1 = require("../utils/password.utils");
const jwt_utils_1 = require("../utils/jwt.utils");
const error_middleware_1 = require("../middlewares/error.middleware");
const prisma = new client_1.PrismaClient();
const register = async (dto) => {
    const existingUser = await prisma.user.findUnique({
        where: { email: dto.email },
    });
    if (existingUser) {
        throw new error_middleware_1.AppError("User already exists", 409);
    }
    const hashedPassword = await (0, password_utils_1.hashPassword)(dto.password);
    const user = await prisma.user.create({
        data: {
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
            preferredName: dto.preferredName,
            gender: dto.gender,
            age: dto.age,
            weight: dto.weight,
            targetWeight: dto.targetWeight,
            height: dto.height,
            bmi: dto.bmi,
            sleepHours: dto.sleepHours,
            waterDaily: dto.waterDaily,
            trainingLevel: dto.trainingLevel,
            trainingEnvironment: dto.trainingEnvironment,
            trainingDaysPerWeek: dto.trainingDaysPerWeek,
        },
    });
    const accessToken = (0, jwt_utils_1.generateToken)({ userId: user.id, email: user.email });
    const refreshToken = (0, jwt_utils_1.generateRefreshToken)({
        userId: user.id,
        email: user.email,
    });
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
};
exports.register = register;
const login = async (dto) => {
    const user = await prisma.user.findUnique({
        where: { email: dto.email },
    });
    if (!user) {
        throw new error_middleware_1.AppError("Invalid credentials", 401);
    }
    const isPasswordValid = await (0, password_utils_1.comparePassword)(dto.password, user.password);
    if (!isPasswordValid) {
        throw new error_middleware_1.AppError("Invalid credentials", 401);
    }
    const token = (0, jwt_utils_1.generateToken)({ userId: user.id, email: user.email });
    const refreshToken = (0, jwt_utils_1.generateRefreshToken)({
        userId: user.id,
        email: user.email,
    });
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken: token, refreshToken };
};
exports.login = login;
const refreshAccessToken = async (token) => {
    try {
        const payload = (0, jwt_utils_1.verifyToken)(token);
        const accessToken = (0, jwt_utils_1.generateToken)({
            userId: payload.userId,
            email: payload.email,
        });
        return { accessToken };
    }
    catch {
        throw new error_middleware_1.AppError("Invalid or expired refresh token", 401);
    }
};
exports.refreshAccessToken = refreshAccessToken;
//# sourceMappingURL=auth.service.js.map