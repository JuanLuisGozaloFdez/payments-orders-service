import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Payment } from '../../models/types';
import { query, getDatabaseStatus } from '../../config/database';

/**
 * Payments Repository
 * Handles all Payment database operations
 */
export class PaymentsRepository extends BaseRepository<Payment> {
  protected tableName = 'payments';

  /**
   * Create new payment
   */
  async create(data: Omit<Payment, 'id'>): Promise<Payment> {
    const id = uuidv4();
    const payment: Payment = {
      ...data,
      id,
    };

    if (getDatabaseStatus().type === 'memory') {
      this.memoryStore.push(payment);
      return payment;
    }

    try {
      await query(
        `INSERT INTO payments (id, order_id, user_id, amount, currency, status, payment_method, transaction_id, stripe_payment_id, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          payment.id,
          payment.orderId,
          payment.userId,
          payment.amount,
          payment.currency || 'USD',
          payment.status,
          payment.paymentMethod,
          payment.transactionId,
          payment.stripePaymentId,
          payment.metadata ? JSON.stringify(payment.metadata) : null,
          payment.createdAt,
          payment.updatedAt,
        ]
      );
      return payment;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Update payment
   */
  async update(id: string, data: Partial<Payment>): Promise<Payment | null> {
    if (getDatabaseStatus().type === 'memory') {
      const index = this.memoryStore.findIndex((p) => p.id === id);
      if (index > -1) {
        this.memoryStore[index] = { ...this.memoryStore[index], ...data };
        return this.memoryStore[index];
      }
      return null;
    }

    try {
      const updates: string[] = [];
      const values: any[] = [id];
      let paramIndex = 2;

      if (data.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (data.stripePaymentId !== undefined) {
        updates.push(`stripe_payment_id = $${paramIndex}`);
        values.push(data.stripePaymentId);
        paramIndex++;
      }

      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        values.push(JSON.stringify(data.metadata));
        paramIndex++;
      }

      updates.push(`updated_at = $${paramIndex}`);
      values.push(Date.now());

      const result = await query(
        `UPDATE payments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  /**
   * Find payment by order ID
   */
  async findByOrderId(orderId: string): Promise<Payment | null> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.find((p) => p.orderId === orderId) || null;
    }

    try {
      const result = await query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding payment by order ID:', error);
      throw error;
    }
  }

  /**
   * Find payments by user ID
   */
  async findByUserId(userId: string): Promise<Payment[]> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.filter((p) => p.userId === userId);
    }

    try {
      const result = await query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return this.mapRows(result.rows);
    } catch (error) {
      console.error('Error finding payments by user ID:', error);
      throw error;
    }
  }

  /**
   * Find payment by Stripe ID
   */
  async findByStripeId(stripePaymentId: string): Promise<Payment | null> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.find((p) => p.stripePaymentId === stripePaymentId) || null;
    }

    try {
      const result = await query('SELECT * FROM payments WHERE stripe_payment_id = $1', [stripePaymentId]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding payment by Stripe ID:', error);
      throw error;
    }
  }

  /**
   * Map database row to Payment object
   */
  protected mapRow(row: any): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      amount: row.amount,
      currency: row.currency || 'USD',
      status: row.status,
      paymentMethod: row.payment_method,
      transactionId: row.transaction_id,
      stripePaymentId: row.stripe_payment_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
