import { Request, Response, NextFunction } from "express"
import { authenticateToken } from "./auth"

// Wrapper function to ensure correct type compatibility with Express
export function auth(req: Request, res: Response, next: NextFunction): void {
  authenticateToken(req, res, next)
}
