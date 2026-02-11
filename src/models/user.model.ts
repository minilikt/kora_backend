export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

// In-memory user storage (replace with database in production)
export const users: User[] = [];

export const findUserByEmail = (email: string): User | undefined => {
  return users.find((user) => user.email === email);
};

export const findUserById = (id: string): User | undefined => {
  return users.find((user) => user.id === id);
};

export const createUser = (user: User): User => {
  users.push(user);
  return user;
};
