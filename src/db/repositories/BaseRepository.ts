import { QueryResult } from 'pg';
import { query, getDatabaseStatus } from '../../config/database';

/**
 * Base Repository
 * Provides abstract methods for CRUD operations
 */
export abstract class BaseRepository<T> {
  protected tableName: string = '';
  protected memoryStore: T[] = [];
  protected isMemoryMode: boolean = getDatabaseStatus().type === 'memory';

  /**
   * Find all records
   */
  async findAll(): Promise<T[]> {
    if (this.isMemoryMode) {
      return [...this.memoryStore];
    }

    try {
      const result = await query(`SELECT * FROM ${this.tableName}`);
      return this.mapRows(result.rows);
    } catch (error) {
      console.error(`Error fetching all from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find by ID
   */
  async findById(id: string): Promise<T | null> {
    if (this.isMemoryMode) {
      return this.memoryStore.find((item: any) => item.id === id) || null;
    }

    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw error;
    }
  }

  /**
   * Find by custom query
   */
  async find(whereClause: string, values?: (string | number | boolean | null)[]): Promise<T[]> {
    if (this.isMemoryMode) {
      return [...this.memoryStore];
    }

    try {
      const result = await query(
        `SELECT * FROM ${this.tableName} WHERE ${whereClause}`,
        values
      );
      return this.mapRows(result.rows);
    } catch (error) {
      console.error(`Error finding in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records
   */
  async count(): Promise<number> {
    if (this.isMemoryMode) {
      return this.memoryStore.length;
    }

    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Create record
   */
  abstract create(data: T): Promise<T>;

  /**
   * Update record
   */
  abstract update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete record
   */
  async delete(id: string): Promise<boolean> {
    if (this.isMemoryMode) {
      const index = this.memoryStore.findIndex((item: any) => item.id === id);
      if (index > -1) {
        this.memoryStore.splice(index, 1);
        return true;
      }
      return false;
    }

    try {
      const result = await query(
        `DELETE FROM ${this.tableName} WHERE id = $1`,
        [id]
      );
      return result.rowCount! > 0;
    } catch (error) {
      console.error(`Error deleting from ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Map single row
   */
  protected mapRow(row: any): T {
    return row as T;
  }

  /**
   * Map multiple rows
   */
  protected mapRows(rows: any[]): T[] {
    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Get memory store (for testing)
   */
  getMemoryStore(): T[] {
    return this.memoryStore;
  }

  /**
   * Clear memory store
   */
  clearMemoryStore(): void {
    this.memoryStore = [];
  }
}
