import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  userId: string; // This will be the email
  name: string;
  phoneNumber: string;
  passwordHash: string;
  isVerified: boolean;
  createdAt: string;
  role: 'user' | 'admin';
}

const STORAGE_PATH = path.join(process.cwd(), 'server', 'storage', 'users.json');

// Ensure directory exists
const dir = path.dirname(STORAGE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const userStorage = {
  getUsers: (): User[] => {
    if (!fs.existsSync(STORAGE_PATH)) {
      return [];
    }
    try {
      const data = fs.readFileSync(STORAGE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  },

  saveUsers: (users: User[]) => {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(users, null, 2));
  },

  findUserByEmail: (email: string): User | undefined => {
    const users = userStorage.getUsers();
    return users.find(u => u.userId === email);
  },

  findUserByPhone: (phoneNumber: string): User | undefined => {
    const users = userStorage.getUsers();
    return users.find(u => u.phoneNumber === phoneNumber);
  },

  findUserById: (userId: string): User | undefined => {
    const users = userStorage.getUsers();
    return users.find(u => u.userId === userId);
  },

  createUser: (user: Omit<User, 'createdAt' | 'isVerified'>): User => {
    const users = userStorage.getUsers();
    const newUser: User = {
      ...user,
      createdAt: new Date().toISOString(),
      isVerified: false, // Default to false until OTP verified
    };
    users.push(newUser);
    userStorage.saveUsers(users);
    return newUser;
  },

  updateUser: (userId: string, updates: Partial<User>): User | undefined => {
    const users = userStorage.getUsers();
    const index = users.findIndex(u => u.userId === userId);
    if (index === -1) return undefined;

    users[index] = { ...users[index], ...updates };
    userStorage.saveUsers(users);
    return users[index];
  }
};
