import type { Request, Response, NextFunction } from "express"
import * as jwt from "jsonwebtoken"

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"

// Define interface for JWT payload
export interface JwtPayload {
  id: string
  username: string
  role?: string
}

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string
        username: string
        email?: string
        role?: string
      }
    }
  }
}

// Middleware to verify JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.header("auth-token") || req.header("x-auth-token")

  if (!token) {
    res.status(401).json({ message: "Access denied. No token provided." })
    return;
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = {
      id: verified.id,
      username: verified.username,
      role: verified.role,
    }
    next()
  } catch (error) {
    res.status(400).json({ message: "Invalid token." })
  }
}
