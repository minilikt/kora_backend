import {
  PrismaClient,
  Gender,
  ExperienceLevel,
  ExerciseEnvironment,
  DayOfWeek,
} from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/password.utils";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/jwt.utils";
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
  workoutDays?: DayOfWeek[];
}

export interface LoginDto {
  email: string;
  password: string;
}

export const register = async (
  dto: RegisterDto,
): Promise<{ user: any; accessToken: string; refreshToken: string }> => {
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
      workoutDays: dto.workoutDays ?? [],
    },
  });

  const accessToken = generateToken({ userId: user.id, email: user.email });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
  });

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken, refreshToken };
};

export const login = async (
  dto: LoginDto,
): Promise<{ user: any; accessToken: string; refreshToken: string }> => {
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
  const refreshToken = generateRefreshToken({
    userId: user.id,
    email: user.email,
  });

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, accessToken: token, refreshToken };
};

export const refreshAccessToken = async (
  token: string,
): Promise<{ accessToken: string }> => {
  try {
    const payload = verifyToken(token);
    const accessToken = generateToken({
      userId: payload.userId,
      email: payload.email,
    });
    return { accessToken };
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
};
