import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, "password">;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId) {
    return res.status(401).send("Unauthorized");
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.userId = undefined;
    return res.status(401).send("Unauthorized");
  }

  const { password, ...userWithoutPassword } = user;
  req.user = userWithoutPassword;
  next();
}

export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}
