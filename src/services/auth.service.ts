import { v4 as uuidv4 } from 'uuid';
import { User, findUserByEmail, createUser } from '../models/user.model';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateToken } from '../utils/jwt.utils';
import { AppError } from '../middlewares/error.middleware';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export const register = async (dto: RegisterDto): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const existingUser = findUserByEmail(dto.email);
  
  if (existingUser) {
    throw new AppError('User already exists', 409);
  }

  const hashedPassword = await hashPassword(dto.password);

  const newUser: User = {
    id: uuidv4(),
    email: dto.email,
    password: hashedPassword,
    name: dto.name,
    createdAt: new Date(),
  };

  createUser(newUser);

  const token = generateToken({ userId: newUser.id, email: newUser.email });

  const { password, ...userWithoutPassword } = newUser;

  return { user: userWithoutPassword, token };
};

export const login = async (dto: LoginDto): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const user = findUserByEmail(dto.email);

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await comparePassword(dto.password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken({ userId: user.id, email: user.email });

  const { password, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};
