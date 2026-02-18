import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middlewares/error.middleware";

const prisma = new PrismaClient();

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const { password, ...userWithoutPassword } = user;

  res.status(200).json({
    status: "success",
    data: { user: userWithoutPassword },
  });
};
