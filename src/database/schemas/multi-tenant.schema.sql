/**
 * SQL Schema para Multi-Tenancy
 * Este archivo contiene las migraciones SQL necesarias para soportar multi-tenancia
 */

-- ============================================================================
-- TABLAS COMPARTIDAS (Shared across all tenants)
-- ============================================================================

-- Tabla de Tenants/Organizaciones
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise', 'custom')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  api_key VARCHAR(255) UNIQUE,
  api_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  metadata JSONB,
  
  INDEX idx_tenants_slug (slug),
  INDEX idx_tenants_status (status),
  INDEX idx_tenants_created_at (created_at)
);

-- Tabla de configuración por tenant
CREATE TABLE IF NOT EXISTS tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  max_users INTEGER DEFAULT 10,
  max_orders INTEGER DEFAULT 1000,
  max_events INTEGER DEFAULT 100,
  features JSONB DEFAULT '[]',
  webhook_url VARCHAR(500),
  custom_domain VARCHAR(255),
  data_residency VARCHAR(50) DEFAULT 'us' CHECK (data_residency IN ('us', 'eu', 'asia', 'global')),
  encryption_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id),
  INDEX idx_tenant_settings_tenant_id (tenant_id)
);

-- Tabla de usuarios del sistema (shared)
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(tenant_id, email),
  INDEX idx_system_users_tenant_id (tenant_id),
  INDEX idx_system_users_email (email),
  INDEX idx_system_users_status (status)
);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  resource VARCHAR(50),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(resource, action)
);

-- Tabla de roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_built_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, name),
  INDEX idx_roles_tenant_id (tenant_id)
);

-- Tabla de asignación de permisos a roles
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(role_id, permission_id)
);

-- Tabla de auditoría de acceso
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  changes JSONB,
  previous JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_audit_logs_tenant_id (tenant_id),
  INDEX idx_audit_logs_user_id (user_id),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_timestamp (timestamp),
  INDEX idx_audit_logs_composite (tenant_id, timestamp DESC)
);

-- Tabla de cuotas por tenant
CREATE TABLE IF NOT EXISTS tenant_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  max_users INTEGER DEFAULT 10,
  used_users INTEGER DEFAULT 0,
  max_orders INTEGER DEFAULT 1000,
  used_orders INTEGER DEFAULT 0,
  max_events INTEGER DEFAULT 100,
  used_events INTEGER DEFAULT 0,
  storage_quota_mb INTEGER DEFAULT 1000,
  used_storage_mb INTEGER DEFAULT 0,
  api_calls_per_day INTEGER DEFAULT 10000,
  used_api_calls INTEGER DEFAULT 0,
  reset_date TIMESTAMP DEFAULT NOW() + INTERVAL '1 day',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_tenant_quotas_tenant_id (tenant_id),
  INDEX idx_tenant_quotas_reset_date (reset_date)
);

-- ============================================================================
-- TABLAS POR TENANT (Todas con tenant_id como FK + índice compuesto)
-- ============================================================================

-- Tabla de órdenes (multi-tenant)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_orders_tenant_id (tenant_id),
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_event_id (event_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_tenant_created (tenant_id, created_at DESC),
  INDEX idx_orders_tenant_user (tenant_id, user_id)
);

-- Tabla de pagos (multi-tenant)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL,
  provider_transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  error_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_payments_tenant_id (tenant_id),
  INDEX idx_payments_order_id (order_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_created_at (created_at),
  INDEX idx_payments_tenant_created (tenant_id, created_at DESC)
);

-- Tabla de transacciones NFT (multi-tenant)
CREATE TABLE IF NOT EXISTS nft_mint_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  nft_contract_address VARCHAR(255),
  nft_token_id VARCHAR(255),
  blockchain_tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'minting', 'minted', 'failed', 'cancelled')),
  metadata JSONB,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_nft_mint_tenant_id (tenant_id),
  INDEX idx_nft_mint_order_id (order_id),
  INDEX idx_nft_mint_user_id (user_id),
  INDEX idx_nft_mint_status (status),
  INDEX idx_nft_mint_created_at (created_at),
  INDEX idx_nft_mint_tenant_created (tenant_id, created_at DESC)
);

-- ============================================================================
-- ROW-LEVEL SECURITY (PostgreSQL)
-- ============================================================================

-- Habilitar RLS en tablas críticas
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_mint_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para órdenes
CREATE POLICY orders_tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY orders_insert_check ON orders
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Políticas RLS para pagos
CREATE POLICY payments_tenant_isolation ON payments
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY payments_insert_check ON payments
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Políticas RLS para transacciones NFT
CREATE POLICY nft_mint_tenant_isolation ON nft_mint_transactions
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY nft_mint_insert_check ON nft_mint_transactions
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Políticas RLS para auditoría
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de usuario completo con role y permisos
CREATE OR REPLACE VIEW v_user_with_permissions AS
SELECT
  u.id,
  u.tenant_id,
  u.email,
  u.name,
  u.role,
  u.status,
  COALESCE(json_agg(p.name) FILTER (WHERE p.name IS NOT NULL), '[]'::json) as permissions
FROM system_users u
LEFT JOIN roles r ON r.tenant_id = u.tenant_id AND r.name = u.role
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
GROUP BY u.id, u.tenant_id, u.email, u.name, u.role, u.status;

-- Vista de órdenes con detalles de pago
CREATE OR REPLACE VIEW v_orders_with_payment AS
SELECT
  o.id,
  o.tenant_id,
  o.event_id,
  o.user_id,
  o.quantity,
  o.total_price,
  o.status as order_status,
  p.id as payment_id,
  p.status as payment_status,
  p.amount,
  o.created_at
FROM orders o
LEFT JOIN payments p ON p.order_id = o.id
ORDER BY o.created_at DESC;
