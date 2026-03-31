import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";

interface DecodedToken {
  userId: string;
  role: string;
  email?: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  // Only 03xnik@gmail.com can access
  if (user && user.email === '03xnik@gmail.com') {
    next();
  } else {
    res.status(403).json({ error: "Access denied: Admin privileges required" });
  }
};
