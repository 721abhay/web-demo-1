import pool from '../config/database';
import { RefreshToken } from '../types/auth';

export class RefreshTokenModel {
  static async create(userId: number, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const query = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, created_at, revoked_at
    `;
    
    const result = await pool.query(query, [userId, tokenHash, expiresAt]);
    return result.rows[0];
  }

  static async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const query = `
      SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
      FROM refresh_tokens
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
    `;
    
    const result = await pool.query(query, [tokenHash]);
    return result.rows[0] || null;
  }

  static async revoke(id: number): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
  }

  static async revokeAllForUser(userId: number): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `;
    
    await pool.query(query, [userId]);
  }

  static async findActiveByUserId(userId: number): Promise<RefreshToken[]> {
    const query = `
      SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
      FROM refresh_tokens
      WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async cleanupExpired(): Promise<number> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR revoked_at IS NOT NULL
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  static async revokeByTokenHash(tokenHash: string): Promise<boolean> {
    const query = `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1 AND revoked_at IS NULL
      RETURNING id
    `;
    
    const result = await pool.query(query, [tokenHash]);
    return (result.rowCount || 0) > 0;
  }
}