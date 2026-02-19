"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = void 0;
const client_1 = require("@prisma/client");
const error_middleware_1 = require("../middlewares/error.middleware");
const prisma = new client_1.PrismaClient();
const getProfile = async (req, res, next) => {
    try {
        if (!req.user)
            throw new error_middleware_1.AppError("Unauthorized", 401);
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { trainingProfile: true },
        });
        if (!user)
            throw new error_middleware_1.AppError("User not found", 404);
        const { password, ...userWithoutPassword } = user;
        // Return both shapes so both syncService (success) and other callers (status) work
        res.status(200).json({
            status: "success",
            success: true,
            data: { user: userWithoutPassword },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
//# sourceMappingURL=user.controller.js.map