/**
 * Tenant Service
 * Lógica de negocio para gestión de tenants
 */

import { IDatabase } from 'pg-promise';
import { TenantInfo, TenantSettings, TenantQuota, TenantUser } from '../types/tenant-context';

export class TenantService {
  constructor(private db: IDatabase<any>) {}

  /**
   * Obtiene información de un tenant
   */
  async getTenantInfo(tenantId: string): Promise<TenantInfo> {
    const tenant = await this.db.oneOrNone(
      `SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
      [tenantId]
    );

    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const settings = await this.getTenantSettings(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
      settings,
    };
  }

  /**
   * Obtiene configuración de un tenant
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const settings = await this.db.oneOrNone(
      `SELECT * FROM tenant_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (!settings) {
      // Crear configuración por defecto
      return {
        maxUsers: 10,
        maxOrders: 1000,
        maxEvents: 100,
        dataResidency: 'global',
        encryptionEnabled: false,
      };
    }

    return {
      maxUsers: settings.max_users,
      maxOrders: settings.max_orders,
      maxEvents: settings.max_events,
      features: settings.features,
      webhookUrl: settings.webhook_url,
      customDomain: settings.custom_domain,
      dataResidency: settings.data_residency,
      encryptionEnabled: settings.encryption_enabled,
    };
  }

  /**
   * Actualiza configuración de un tenant
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>
  ): Promise<TenantSettings> {
    const result = await this.db.one(
      `
      INSERT INTO tenant_settings (tenant_id, max_users, max_orders, max_events, 
                                   webhook_url, custom_domain, data_residency, encryption_enabled)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (tenant_id) DO UPDATE SET
        max_users = COALESCE($2, max_users),
        max_orders = COALESCE($3, max_orders),
        max_events = COALESCE($4, max_events),
        webhook_url = COALESCE($5, webhook_url),
        custom_domain = COALESCE($6, custom_domain),
        data_residency = COALESCE($7, data_residency),
        encryption_enabled = COALESCE($8, encryption_enabled),
        updated_at = NOW()
      RETURNING *
      `,
      [
        tenantId,
        settings.maxUsers,
        settings.maxOrders,
        settings.maxEvents,
        settings.webhookUrl,
        settings.customDomain,
        settings.dataResidency,
        settings.encryptionEnabled,
      ]
    );

    return {
      maxUsers: result.max_users,
      maxOrders: result.max_orders,
      maxEvents: result.max_events,
      features: result.features,
      webhookUrl: result.webhook_url,
      customDomain: result.custom_domain,
      dataResidency: result.data_residency,
      encryptionEnabled: result.encryption_enabled,
    };
  }

  /**
   * Obtiene las cuotas y uso del tenant
   */
  async getQuotas(tenantId: string): Promise<TenantQuota> {
    const quota = await this.db.one(
      `SELECT * FROM tenant_quotas WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      tenantId: quota.tenant_id,
      maxUsers: quota.max_users,
      usedUsers: quota.used_users,
      maxOrders: quota.max_orders,
      usedOrders: quota.used_orders,
      maxEvents: quota.max_events,
      usedEvents: quota.used_events,
      storageQuota: quota.storage_quota_mb,
      usedStorage: quota.used_storage_mb,
      apiCallsPerDay: quota.api_calls_per_day,
      usedApiCalls: quota.used_api_calls,
      resetDate: quota.reset_date,
    };
  }

  /**
   * Valida que el tenant no ha excedido sus cuotas
   */
  async validateQuota(tenantId: string, resource: string): Promise<boolean> {
    const quota = await this.getQuotas(tenantId);

    switch (resource) {
      case 'users':
        if (quota.usedUsers >= quota.maxUsers) {
          throw new Error(`User quota exceeded for tenant ${tenantId}`);
        }
        break;
      case 'orders':
        if (quota.usedOrders >= quota.maxOrders) {
          throw new Error(`Order quota exceeded for tenant ${tenantId}`);
        }
        break;
      case 'events':
        if (quota.usedEvents >= quota.maxEvents) {
          throw new Error(`Event quota exceeded for tenant ${tenantId}`);
        }
        break;
      case 'api_calls':
        if (quota.usedApiCalls >= quota.apiCallsPerDay) {
          throw new Error(`API calls quota exceeded for tenant ${tenantId}`);
        }
        break;
    }

    return true;
  }

  /**
   * Incrementa el uso de una cuota
   */
  async incrementQuota(tenantId: string, resource: string, amount: number = 1): Promise<void> {
    const field = this.getQuotaFieldForResource(resource);
    await this.db.none(
      `
      UPDATE tenant_quotas
      SET ${field} = ${field} + $2,
          updated_at = NOW()
      WHERE tenant_id = $1
      `,
      [tenantId, amount]
    );
  }

  /**
   * Obtiene todos los usuarios del tenant
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    const users = await this.db.query(
      `
      SELECT
        id,
        tenant_id,
        email,
        name,
        role,
        status,
        created_at,
        updated_at,
        last_login
      FROM system_users
      WHERE tenant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      `,
      [tenantId]
    );

    return users.map((u) => ({
      id: u.id,
      tenantId: u.tenant_id,
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: [], // Cargar desde rol
      status: u.status,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      lastLogin: u.last_login,
    }));
  }

  /**
   * Obtiene estadísticas del tenant
   */
  async getTenantStats(tenantId: string) {
    const stats = await this.db.one(
      `
      SELECT
        (SELECT COUNT(*) FROM system_users WHERE tenant_id = $1 AND deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days') as orders_last_30_days,
        (SELECT SUM(total_price) FROM orders WHERE tenant_id = $1 AND status = 'completed' AND created_at > NOW() - INTERVAL '30 days') as revenue_last_30_days,
        (SELECT COUNT(*) FROM audit_logs WHERE tenant_id = $1 AND timestamp > NOW() - INTERVAL '7 days') as audit_events_last_7_days
      `,
      [tenantId]
    );

    return {
      totalUsers: parseInt(stats.total_users),
      ordersLast30Days: parseInt(stats.orders_last_30_days),
      revenueLast30Days: parseFloat(stats.revenue_last_30_days || 0),
      auditEventsLast7Days: parseInt(stats.audit_events_last_7_days),
    };
  }

  /**
   * Crea un nuevo tenant
   */
  async createTenant(data: {
    name: string;
    slug: string;
    email: string;
    plan?: string;
  }): Promise<TenantInfo> {
    const tenant = await this.db.one(
      `
      INSERT INTO tenants (name, slug, email, plan, status)
      VALUES ($1, $2, $3, $4, 'active')
      RETURNING *
      `,
      [data.name, data.slug, data.email, data.plan || 'free']
    );

    // Crear configuración por defecto
    await this.db.none(
      `
      INSERT INTO tenant_settings (tenant_id, max_users, max_orders, max_events)
      VALUES ($1, 10, 1000, 100)
      `,
      [tenant.id]
    );

    // Crear cuotas por defecto
    await this.db.none(
      `
      INSERT INTO tenant_quotas (tenant_id, max_users, max_orders, max_events, api_calls_per_day)
      VALUES ($1, 10, 1000, 100, 10000)
      `,
      [tenant.id]
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.created_at,
      updatedAt: tenant.updated_at,
    };
  }

  /**
   * Suspende un tenant
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await this.db.none(
      `
      UPDATE tenants
      SET status = 'suspended',
          metadata = jsonb_set(metadata, '{suspension_reason}', $2::jsonb),
          updated_at = NOW()
      WHERE id = $1
      `,
      [tenantId, JSON.stringify(reason)]
    );

    // Log de auditoría
    await this.db.none(
      `
      INSERT INTO audit_logs (tenant_id, action, resource, status, metadata)
      VALUES ($1, 'SUSPEND_TENANT', 'tenant', 'success', $2)
      `,
      [tenantId, JSON.stringify({ reason })]
    );
  }

  /**
   * Helper: obtiene el campo de cuota para un recurso
   */
  private getQuotaFieldForResource(resource: string): string {
    const fields: Record<string, string> = {
      users: 'used_users',
      orders: 'used_orders',
      events: 'used_events',
      api_calls: 'used_api_calls',
      storage: 'used_storage_mb',
    };
    return fields[resource] || 'used_orders';
  }
}
