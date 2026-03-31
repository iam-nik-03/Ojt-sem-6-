import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userStorage, User } from "../storage/userStorage";

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";

export const userAuthController = {
  signup: async (req: Request, res: Response) => {
    const { name, email, phoneNumber, password, confirmPassword } = req.body;

    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Gmail validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please provide a valid Gmail address" });
    }

    // Phone number validation (exactly 10 digits)
    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    if (sanitizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must contain exactly 10 digits" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const existingUser = userStorage.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "Gmail address already registered" });
    }

    // Create user immediately
    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = email === '03xnik@gmail.com';
    const role = isAdmin ? 'admin' : 'user';
    
    const user = userStorage.createUser({
      userId: email, // Gmail as userId
      name,
      phoneNumber: sanitizedPhone,
      passwordHash,
      role: role
    });

    // Mark as verified immediately
    userStorage.updateUser(user.userId, { isVerified: true });

    // Auto login
    const token = jwt.sign({ userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { userId: user.userId, name: user.name, role: user.role } });
  },

  login: async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Gmail and password are required" });
    }

    // Check for Admin
    const user = userStorage.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.userId, role: user.role, email: user.userId }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { userId: user.userId, name: user.name, role: user.role } });
  },

  me: async (req: Request, res: Response) => {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; email?: string };
      
      if (decoded.role === 'admin') {
        return res.json({ user: { userId: decoded.userId, name: "Admin", role: "admin", email: decoded.email } });
      }

      const user = userStorage.findUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      res.json({ user: { userId: user.userId, name: user.name, role: user.role, email: user.userId } });
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  },

  googleLogin: async (req: Request, res: Response) => {
    const { email, name, uid, photoURL } = req.body;

    if (!email || !uid) {
      return res.status(400).json({ error: "Email and UID are required" });
    }

    // Check if user exists, if not create
    let user = userStorage.findUserByEmail(email);
    const isAdmin = email === '03xnik@gmail.com';
    const role = isAdmin ? 'admin' : 'user';

    if (!user) {
      user = userStorage.createUser({
        userId: email,
        name: name || email.split('@')[0],
        phoneNumber: '',
        passwordHash: '', // No password for Google users
        role: role
      });
      userStorage.updateUser(user.userId, { isVerified: true });
    } else if (user.role !== role) {
      // Update role if it changed (e.g. user became admin)
      userStorage.updateUser(user.userId, { role });
    }

    const token = jwt.sign({ userId: user.userId, role: role, email: email }, JWT_SECRET, { expiresIn: "7d" });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { userId: user.userId, name: user.name, role: role, email: email } });
  },

  logout: (req: Request, res: Response) => {
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res.json({ success: true });
  },

  getAdminStats: (req: Request, res: Response) => {
    const users = userStorage.getUsers();
    const totalUsers = users.length;
    const recentSignups = users.filter(u => {
      const createdAt = new Date(u.createdAt);
      const now = new Date();
      const diff = now.getTime() - createdAt.getTime();
      return diff < 7 * 24 * 60 * 60 * 1000; // Last 7 days
    }).length;

    res.json({
      totalUsers,
      recentSignups,
      activeUsers: totalUsers // Mock for now
    });
  },

  getAllUsers: (req: Request, res: Response) => {
    const users = userStorage.getUsers();
    res.json(users.map(u => ({
      userId: u.userId,
      name: u.name,
      email: u.userId,
      phoneNumber: u.phoneNumber,
      createdAt: u.createdAt,
      isVerified: u.isVerified,
      role: u.role
    })));
  }
};
