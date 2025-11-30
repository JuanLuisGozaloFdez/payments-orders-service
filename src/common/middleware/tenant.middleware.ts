/**
 * Tenant Extraction Middleware
 * Extrae tenant_id del JWT token y lo añade al contexto de la request
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { TenantContext, JWTPayload } from '../types/tenant-context';

/**
 * Interfaz extendida de Express Request para incluir tenant context
 */
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
      userId?: string;
      tenantId?: string;
    }
  }
}

/**
 * Middleware para extraer y validar tenant_id del JWT
 * Debe ser aplicado ANTES que otras middlewares de autenticación
 */
export function tenantExtractorMiddleware(
  jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Obtener token del header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Si no hay token, permitir pero sin contexto de tenant
        // (útil para endpoints públicos)
        return next();
      }

      const token = authHeader.substring(7);

      // Verificar y decodificar token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      // Extraer tenant_id del token
      const tenantId = decoded.tenant_id || decoded.sub?.split('|')[0];
      if (!tenantId) {
        return res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Token does not contain tenant_id',
        });
      }

      // Construir contexto de tenant
      const tenantContext: TenantContext = {
        tenantId,
        userId: decoded.sub,
        tenantName: decoded.tenant_name,
        plan: decoded.plan || 'free',
        role: decoded.role || 'user',
        permissions: decoded.permissions || [],
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
        metadata: decoded.metadata,
      };

      // Añadir a request
      req.tenantContext = tenantContext;
      req.userId = tenantContext.userId;
      req.tenantId = tenantId;

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'INVALID_TOKEN',
          message: 'Token verification failed',
        });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        });
      }
      next(error);
    }
  };
}

/**
 * Decorator para Express controllers (para obtener el tenant del contexto)
 * Uso: const tenant = req.tenantContext
 */
export function getTenantFromRequest(req: Request): TenantContext | undefined {
  return req.tenantContext;
}

/**
 * Validador que asegura que el tenant_id está presente
 */
export function requireTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.tenantContext) {
    return res.status(401).json({
      error: 'TENANT_REQUIRED',
      message: 'No tenant context found. Authentication required.',
    });
  }
  next();
}

/**
 * Validador que verifica que el usuario tiene un rol específico
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({
        error: 'TENANT_REQUIRED',
        message: 'No tenant context found',
      });
    }

    if (!allowedRoles.includes(req.tenantContext.role)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Validador que verifica que el usuario tiene un permiso específico
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return res.status(401).json({
        error: 'TENANT_REQUIRED',
        message: 'No tenant context found',
      });
    }

    const hasPermission = requiredPermissions.some((perm) =>
      req.tenantContext!.permissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of these permissions: ${requiredPermissions.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Genera un JWT token con contexto de tenant
 */
export function generateTenantToken(
  payload: TenantContext,
  jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: string = '1h'
): string {
  const jwtPayload: JWTPayload = {
    sub: payload.userId,
    tenant_id: payload.tenantId,
    tenant_name: payload.tenantName,
    role: payload.role,
    permissions: payload.permissions,
    plan: payload.plan,
  };

  return jwt.sign(jwtPayload, jwtSecret, { expiresIn });
}
