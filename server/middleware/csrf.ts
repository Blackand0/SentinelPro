import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

export function generateCsrfToken(req: Request, res: Response) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString("hex");
  }
  res.cookie("XSRF-TOKEN", req.session.csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

const exemptRoutes = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

export function validateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  if (exemptRoutes.includes(req.path)) {
    return next();
  }

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromSession = req.session.csrfToken;

  if (!tokenFromHeader || tokenFromHeader !== tokenFromSession) {
    return res.status(403).send("Invalid CSRF token");
  }

  next();
}
