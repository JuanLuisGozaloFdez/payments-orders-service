/**
 * Tenant Context Types
 * Define las interfaces para el contexto multi-tenant del sistema
 */

/**
 * Información del tenant extraída del JWT token
 */
export interface TenantContext {
  /** ID único del tenant/organización */
  tenantId: string;

  /** ID del usuario autenticado */
  userId: string;

  /** Nombre del tenant (opcional) */
  tenantName?: string;

  /** Plan del tenant (free, pro, enterprise, etc) */
  plan?: 'free' | 'pro' | 'enterprise' | 'custom';

  /** Rol del usuario en el tenant */
  role: 'admin' | 'manager' | 'user' | 'viewer';

  /** Permisos específicos del usuario */
  permissions: string[];

  /** Timestamp de emisión del token */
  issuedAt?: number;

  /** Timestamp de expiración del token */
  expiresAt?: number;

  /** Metadatos adicionales */
  metadata?: Record<string, any>;
}

/**
 * Payload del JWT token
 */
export interface JWTPayload {
  sub: string; // user_id
  tenant_id: string; // organization_id
  role: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Información de un Tenant/Organización
 */
export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise' | 'custom';
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  settings?: TenantSettings;
}

/**
 * Configuración específica del tenant
 */
export interface TenantSettings {
  maxUsers?: number;
  maxOrders?: number;
  maxEvents?: number;
  features?: string[];
  webhookUrl?: string;
  customDomain?: string;
  dataResidency?: 'us' | 'eu' | 'asia' | 'global';
  encryptionEnabled?: boolean;
  [key: string]: any;
}

/**
 * Información de usuario dentro de un tenant
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

/**
 * Rol dentro de un tenant
 */
export interface TenantRole {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Log de auditoría por tenant
 */
export interface TenantAuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  error?: string;
  timestamp: Date;
}

/**
 * Cuotas y límites por tenant
 */
export interface TenantQuota {
  tenantId: string;
  maxUsers: number;
  usedUsers: number;
  maxOrders: number;
  usedOrders: number;
  maxEvents: number;
  usedEvents: number;
  storageQuota: number; // en MB
  usedStorage: number; // en MB
  apiCallsPerDay: number;
  usedApiCalls: number;
  resetDate: Date;
}

/**
 * Resultado de validación de tenant
 */
export interface TenantValidationResult {
  valid: boolean;
  tenantId?: string;
  error?: string;
  reason?: string;
}
