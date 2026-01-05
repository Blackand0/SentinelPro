import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { storage, sql } from "../storage";
import jwt from "jsonwebtoken";

// Helper para validar acceso a recursos de empresa
export async function validateCompanyResource(
  req: Request,
  res: Response,
  next: NextFunction,
  resourceId: string,
  getResourceCompanyId: (id: string) => Promise<string | undefined>
) {
  try {
    // Super-admin puede acceder a todo
    if (req.user?.role === "super-admin") {
      return next();
    }

    // Verificar que el usuario tenga company_id
    if (!req.user?.companyId) {
      return res.status(403).send("Usuario no tiene empresa asignada");
    }

    // Obtener el company_id del recurso
    const resourceCompanyId = await getResourceCompanyId(resourceId);

    if (!resourceCompanyId) {
      return res.status(404).send("Recurso no encontrado");
    }

    // Verificar que el recurso pertenezca a la misma empresa
    if (resourceCompanyId !== req.user.companyId) {
      return res.status(403).send("No tienes acceso a este recurso");
    }

    next();
  } catch (error) {
    console.error("Error validating company resource:", error);
    res.status(500).send("Error de validación de acceso");
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
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized");
  }

  const token = authHeader.substring(7);
  const secret = process.env.SESSION_SECRET || "sentinel-pro-dev-secret-change-for-production";

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };
    await sql`SELECT set_security_context(null, 'super-admin')`;

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log(`❌ User ${decoded.userId} not found in database`);
      return res.status(401).send("Unauthorized");
    }

    console.log(`✅ User found in requireAuth: ${user.username}, role: ${user.role}`);
    const { password, ...userWithoutPassword } = user;
    req.user = userWithoutPassword;

    try {
      await sql`SELECT set_security_context(${user.companyId || null}, ${user.role})`;

      await sql`
        SELECT set_config('app.current_user_id', ${user.id}, false),
               set_config('app.client_ip', ${req.ip || req.connection.remoteAddress || ''}, false),
               set_config('app.user_agent', ${req.get('User-Agent') || ''}, false)
      `;
    } catch (rlsError) {
      console.error('Error setting RLS context:', rlsError);
    }

    next();
  } catch (err) {
    return res.status(401).send("Unauthorized");
  }
}

export function requireRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).send("Forbidden");
    }
    next();
  };
}

export function requireCompanyAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Super-admin puede acceder a todo
    if (req.user?.role === "super-admin") {
      return next();
    }

    // Verificar que el usuario tenga company_id asignado
    if (!req.user?.companyId) {
      return res.status(403).send("Usuario no tiene empresa asignada");
    }

    next();
  };
}

export function requireSameCompany(resourceCompanyId?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Super-admin puede acceder a todo
    if (req.user?.role === "super-admin") {
      return next();
    }

    // Verificar que el usuario tenga company_id
    if (!req.user?.companyId) {
      return res.status(403).send("Usuario no tiene empresa asignada");
    }

    // Verificar que el recurso pertenezca a la misma empresa
    if (resourceCompanyId && resourceCompanyId !== req.user.companyId) {
      return res.status(403).send("No tienes acceso a recursos de otra empresa");
    }

    next();
  };
}

// Middleware para validar acceso estricto a empresa en operaciones de escritura
export function requireStrictCompanyAccess(operation: 'create' | 'update' | 'delete' = 'create') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Super-admin puede acceder a todo
    if (req.user?.role === "super-admin") {
      return next();
    }

    // Verificar que el usuario tenga company_id asignado
    if (!req.user?.companyId) {
      return res.status(403).send("Usuario no tiene empresa asignada");
    }

    // Para operaciones de creación, verificar que el body contenga la company correcta
    if (operation === 'create' && req.body.companyId) {
      if (req.body.companyId !== req.user.companyId) {
        return res.status(403).send("No puedes crear recursos para otra empresa");
      }
    }

    // Para operaciones de actualización y eliminación, el validateCompanyResource
    // ya se encarga de verificar el propietario del recurso

    next();
  };
}

// Middleware para validar límites de rate limiting por empresa
export function companyRateLimit(windowMs: number = 60000, maxRequests: number = 100) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const companyId = req.user?.companyId || 'anonymous';
    const now = Date.now();
    const windowKey = `${companyId}-${Math.floor(now / windowMs)}`;

    const current = requests.get(windowKey) || { count: 0, resetTime: now + windowMs };

    if (current.count >= maxRequests) {
      return res.status(429).send("Demasiadas solicitudes. Inténtalo más tarde.");
    }

    current.count++;
    requests.set(windowKey, current);

    // Limpiar entradas expiradas
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) {
        requests.delete(key);
      }
    }

    next();
  };
}

// Middleware para validar integridad de datos multi-tenant
export function validateMultiTenantIntegrity() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Verificar que no se estén pasando company_id de otras empresas en el body
    const bodyCompanyId = req.body?.companyId || req.body?.company_id;

    if (bodyCompanyId && req.user?.role !== 'super-admin') {
      if (!req.user?.companyId) {
        return res.status(403).send("Usuario sin empresa asignada");
      }

      if (bodyCompanyId !== req.user.companyId) {
        return res.status(403).send("Intento de acceso no autorizado a otra empresa");
      }
    }

    // Verificar que los IDs de recursos relacionados pertenezcan a la misma empresa
    const relatedIds = [
      req.body?.printerId,
      req.body?.paperTypeId,
      req.body?.userId,
      req.params?.id
    ].filter(Boolean);

    if (relatedIds.length > 0 && req.user?.role !== 'super-admin') {
      // Esta validación adicional se puede implementar según sea necesario
      // Por ahora confiamos en RLS y las validaciones existentes
    }

    next();
  };
}

export function clearSecurityContext(req: Request, res: Response, next: NextFunction) {
  res.on('finish', async () => {
    try {
      await sql.unsafe(`SELECT clear_security_context()`);
    } catch (error) {
      console.error('Error limpiando contexto de seguridad:', error);
    }
  });
  next();
}
