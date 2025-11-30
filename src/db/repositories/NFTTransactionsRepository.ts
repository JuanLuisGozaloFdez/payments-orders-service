import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './BaseRepository';
import { NFTMintTransaction } from '../../models/types';
import { query, getDatabaseStatus } from '../../config/database';

/**
 * NFT Mint Transactions Repository
 * Handles all NFT minting transaction database operations
 */
export class NFTTransactionsRepository extends BaseRepository<NFTMintTransaction> {
  protected tableName = 'nft_mint_transactions';

  /**
   * Create new NFT transaction
   */
  async create(data: Omit<NFTMintTransaction, 'id'>): Promise<NFTMintTransaction> {
    const id = uuidv4();
    const transaction: NFTMintTransaction = {
      ...data,
      id,
    };

    if (getDatabaseStatus().type === 'memory') {
      this.memoryStore.push(transaction);
      return transaction;
    }

    try {
      await query(
        `INSERT INTO nft_mint_transactions (id, order_id, user_id, token_id, contract_address, blockchain, transaction_hash, status, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          transaction.id,
          transaction.orderId,
          transaction.userId,
          transaction.tokenId,
          transaction.contractAddress,
          transaction.blockchain,
          transaction.transactionHash,
          transaction.status,
          transaction.metadata ? JSON.stringify(transaction.metadata) : null,
          transaction.createdAt,
          transaction.updatedAt,
        ]
      );
      return transaction;
    } catch (error) {
      console.error('Error creating NFT transaction:', error);
      throw error;
    }
  }

  /**
   * Update NFT transaction
   */
  async update(id: string, data: Partial<NFTMintTransaction>): Promise<NFTMintTransaction | null> {
    if (getDatabaseStatus().type === 'memory') {
      const index = this.memoryStore.findIndex((t) => t.id === id);
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

      if (data.transactionHash !== undefined) {
        updates.push(`transaction_hash = $${paramIndex}`);
        values.push(data.transactionHash);
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
        `UPDATE nft_mint_transactions SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        values
      );

      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating NFT transaction:', error);
      throw error;
    }
  }

  /**
   * Find transaction by order ID
   */
  async findByOrderId(orderId: string): Promise<NFTMintTransaction[]> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.filter((t) => t.orderId === orderId);
    }

    try {
      const result = await query(
        'SELECT * FROM nft_mint_transactions WHERE order_id = $1 ORDER BY created_at DESC',
        [orderId]
      );
      return this.mapRows(result.rows);
    } catch (error) {
      console.error('Error finding NFT transactions by order ID:', error);
      throw error;
    }
  }

  /**
   * Find transaction by transaction hash
   */
  async findByTransactionHash(hash: string): Promise<NFTMintTransaction | null> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.find((t) => t.transactionHash === hash) || null;
    }

    try {
      const result = await query('SELECT * FROM nft_mint_transactions WHERE transaction_hash = $1', [hash]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding NFT transaction by hash:', error);
      throw error;
    }
  }

  /**
   * Find pending transactions
   */
  async findPending(): Promise<NFTMintTransaction[]> {
    if (getDatabaseStatus().type === 'memory') {
      return this.memoryStore.filter((t) => t.status === 'pending');
    }

    try {
      const result = await query(
        'SELECT * FROM nft_mint_transactions WHERE status = $1 ORDER BY created_at ASC',
        ['pending']
      );
      return this.mapRows(result.rows);
    } catch (error) {
      console.error('Error finding pending NFT transactions:', error);
      throw error;
    }
  }

  /**
   * Map database row to NFTMintTransaction object
   */
  protected mapRow(row: any): NFTMintTransaction {
    return {
      id: row.id,
      orderId: row.order_id,
      userId: row.user_id,
      tokenId: row.token_id,
      contractAddress: row.contract_address,
      blockchain: row.blockchain,
      transactionHash: row.transaction_hash,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
