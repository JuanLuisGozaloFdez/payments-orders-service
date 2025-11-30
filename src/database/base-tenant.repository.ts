/**
 * Base Tenant-Aware Repository
 * Proporciona aislamiento automático de datos por tenant
 */

import { IDatabase, ITask } from 'pg-promise';
import { TenantContext } from '../types/tenant-context';

/**
 * Opciones para queries tenant-aware
 */
export interface TenantQueryOptions {
  tenantId?: string;
  userId?: string;
  includeTenantId?: boolean; // Inyectar tenant_id automáticamente
  validateTenantId?: boolean; // Validar que coincida con contexto
  auditLog?: boolean; // Log de auditoría
}

/**
 * Base repository que maneja aislamiento de datos por tenant
 */
export abstract class BaseTenantRepository {
  protected db: IDatabase<any>;
  protected tableName: string;

  constructor(db: IDatabase<any>, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Obtiene todos los registros del tenant actual
   */
  async findAll(
    tenantId: string,
    options?: { limit?: number; offset?: number }
  ) {
    const query = this.db.query(
      `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 LIMIT $2 OFFSET $3`,
      [tenantId, options?.limit || 1000, options?.offset || 0]
    );
    return query;
  }

  /**
   * Obtiene un registro por ID, validando que pertenece al tenant
   */
  async findById(tenantId: string, id: string) {
    const record = await this.db.oneOrNone(
      `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );

    if (!record) {
      throw new Error(`Record not found or does not belong to tenant ${tenantId}`);
    }

    return record;
  }

  /**
   * Crea un nuevo registro con tenant_id automático
   */
  async create(tenantId: string, data: any, options?: TenantQueryOptions) {
    // Inyectar tenant_id
    const dataWithTenant = {
      ...data,
      tenant_id: tenantId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Construir query dinámicamente
    const columns = Object.keys(dataWithTenant);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(dataWithTenant);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const record = await this.db.one(query, values);

    // Audit log si aplica
    if (options?.auditLog) {
      await this.logAudit(tenantId, options.userId, 'CREATE', this.tableName, record.id, data);
    }

    return record;
  }

  /**
   * Actualiza un registro validando tenant_id
   */
  async update(
    tenantId: string,
    id: string,
    data: any,
    options?: TenantQueryOptions
  ) {
    // Validar que el registro pertenece al tenant
    const existing = await this.findById(tenantId, id);
    if (!existing) {
      throw new Error('Record not found or does not belong to tenant');
    }

    // Preparar datos actualizados
    const dataWithTimestamp = {
      ...data,
      updated_at: new Date(),
    };

    const columns = Object.keys(dataWithTimestamp);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const values = [...Object.values(dataWithTimestamp), tenantId, id];

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE tenant_id = $${columns.length + 1}
      AND id = $${columns.length + 2}
      RETURNING *
    `;

    const updated = await this.db.one(query, values);

    // Audit log si aplica
    if (options?.auditLog) {
      await this.logAudit(
        tenantId,
        options.userId,
        'UPDATE',
        this.tableName,
        id,
        data,
        existing
      );
    }

    return updated;
  }

  /**
   * Elimina un registro validando tenant_id
   */
  async delete(
    tenantId: string,
    id: string,
    options?: TenantQueryOptions
  ): Promise<boolean> {
    // Validar que existe
    await this.findById(tenantId, id);

    const result = await this.db.result(
      `DELETE FROM ${this.tableName} WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );

    // Audit log si aplica
    if (options?.auditLog) {
      await this.logAudit(tenantId, options.userId, 'DELETE', this.tableName, id);
    }

    return result.rowCount === 1;
  }

  /**
   * Ejecuta un query personalizado con validación de tenant
   * Nota: El query debe incluir el filtro de tenant_id
   */
  async query(
    query: string,
    values: any[],
    options?: TenantQueryOptions
  ) {
    // Validación básica: query debe contener tenant_id
    if (options?.validateTenantId && !query.toLowerCase().includes('tenant_id')) {
      throw new Error(
        'Query must include tenant_id filter for security. Use unsafe() if you really want to skip this.'
      );
    }

    return this.db.query(query, values);
  }

  /**
   * Query sin validación de tenant (usar con cuidado)
   */
  async unsafe(query: string, values: any[]) {
    console.warn('⚠️  UNSAFE QUERY EXECUTED - Ensure you understand the security implications');
    return this.db.query(query, values);
  }

  /**
   * Ejecuta múltiples operaciones en una transacción
   */
  async transaction<T>(
    tenantId: string,
    callback: (task: ITask<any>) => Promise<T>
  ): Promise<T> {
    return this.db.tx((task) => callback(task));
  }

  /**
   * Log de auditoría
   */
  protected async logAudit(
    tenantId: string,
    userId: string | undefined,
    action: string,
    resource: string,
    resourceId: string,
    changes?: any,
    previous?: any
  ) {
    try {
      await this.db.none(
        `
        INSERT INTO audit_logs (tenant_id, user_id, action, resource, resource_id, changes, previous, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        [tenantId, userId || 'system', action, resource, resourceId, JSON.stringify(changes), JSON.stringify(previous)]
      );
    } catch (error) {
      console.error('Error logging audit:', error);
      // No lanzar error, solo log
    }
  }

  /**
   * Valida que el tenant tiene cuota disponible
   */
  async validateQuota(
    tenantId: string,
    resource: string,
    currentCount: number,
    limit: number
  ): Promise<boolean> {
    if (currentCount >= limit) {
      throw new Error(`Quota exceeded for ${resource}`);
    }
    return true;
  }

  /**
   * Obtiene estadísticas de uso del tenant
   */
  async getTenantStats(tenantId: string) {
    const stats = await this.db.one(
      `
      SELECT
        (SELECT COUNT(*) FROM ${this.tableName} WHERE tenant_id = $1) as total_records,
        (SELECT COUNT(DISTINCT id) FROM ${this.tableName} WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours') as records_today
      `,
      [tenantId]
    );
    return stats;
  }
}
