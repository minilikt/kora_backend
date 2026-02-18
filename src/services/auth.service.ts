import {
  PrismaClient,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
} from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password.utils";
import { generateToken } from "../utils/jwt.utils";
import { AppError } from "../middlewares/error.middleware";

const prisma = new PrismaClient();

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  preferredName?: string;
  gender?: Gender;
  age?: number;
  weight?: number;
  targetWeight?: number;
  height?: number;
  bmi?: number;
  sleepHours?: number;
  waterDaily?: number;
  trainingLevel?: ExperienceLevel;
  trainingEnvironment?: ExerciseEnvironment;
  trainingDaysPerWeek?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export const register = async (
  dto: RegisterDto,
): Promise<{ user: any; token: string }> => {
  const existingUser = await prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (existingUser) {
    throw new AppError("User already exists", 409);
  }

  const hashedPassword = await hashPassword(dto.password);

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

  const token = generateToken({ userId: user.id, email: user.email });

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

export const login = async (
  dto: LoginDto,
): Promise<{ user: any; token: string }> => {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isPasswordValid = await comparePassword(dto.password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken({ userId: user.id, email: user.email });

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};
