import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { Order } from '../../models/types';
import { query, getDatabaseStatus } from '../../config/database';

/**
 * Orders Repository
 * Handles all Order database operations
 */
export class OrdersRepository extends BaseRepository<Order> {
  protected tableName = 'orders';

  /**
   * Create new order
   */
  async create(data: Omit<Order, 'id'>): Promise<Order> {
    const id = uuidv4();
    const order: Order = {
      ...data,
      id,
    };

    if (getDatabaseStatus().type === 'memory') {
      this.memoryStore.push(order);
      return order;
    }

    try {
      await query(
        `INSERT INTO orders (id, user_id, ticket_id, quantity, total_amount, status, nft_token_ids, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          order.id,
          order.userId,
          order.ticketId,
          order.quantity,
          order.totalAmount,
          order.status,
          JSON.stringify(order.nftTokenIds),
          order.createdAt,
          order.updatedAt,
        ]
      );
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update order
   */
  async update(id: string, data: Partial<Order>): Promise<Order | null> {
    if (getDatabaseStatus().type === 'memory') {
      const index = this.memoryStore.findIndex((o) => o.id === id);
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

      if (data.nftTokenIds !== undefined) {
        updates.push(`nft_token_ids = $${paramIndex}`);
        values.push(JSON.stringify(data.nftTokenIds));
        paramIndex++;
      }

      updates.push(`updated_at = $${paramIndex}`);
      values.push(Date.now());

      const result = await query(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  /**
   * Find orders by user ID
   */
  async findByUserId(userId: string): Promise<Order[]> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.filter((o) => o.userId === userId);
    }

    try {
      const result = await query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return this.mapRows(result.rows);
    } catch (error) {
      console.error('Error finding orders by user ID:', error);
      throw error;
    }
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: Order['status']): Promise<Order[]> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.filter((o) => o.status === status);
    }

    try {
      const result = await query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status]);
      return this.mapRows(result.rows);
    } catch (error) {
      console.error('Error finding orders by status:', error);
      throw error;
    }
  }

  /**
   * Add NFT token to order
   */
  async addNFTToken(orderId: string, tokenId: string): Promise<Order | null> {
    if (getDatabaseStatus().type === 'memory') {
      const order = this.memoryStore.find((o) => o.id === orderId);
      if (order) {
        order.nftTokenIds.push(tokenId);
        order.updatedAt = Date.now();
        return order;
      }
      return null;
    }

    try {
      const result = await query(
        `UPDATE orders 
         SET nft_token_ids = array_append(nft_token_ids, $1), updated_at = $2 
         WHERE id = $3 
         RETURNING *`,
        [tokenId, Date.now(), orderId]
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error adding NFT token to order:', error);
      throw error;
    }
  }

  /**
   * Map database row to Order object
   */
  protected mapRow(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      ticketId: row.ticket_id,
      quantity: row.quantity,
      totalAmount: row.total_amount,
      status: row.status,
      nftTokenIds: Array.isArray(row.nft_token_ids) ? row.nft_token_ids : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
