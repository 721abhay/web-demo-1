import { Request, Response } from 'express';
import Joi from 'joi';
import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
  validateEmail,
  validatePassword
} from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth';

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().max(255),
  password: Joi.string().required().min(8).max(128)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const { email, password } = value;

      // Additional email validation
      if (!validateEmail(email)) {
        res.status(400).json({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        });
        return;
      }

      // Password strength validation
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        res.status(400).json({
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
          code: 'WEAK_PASSWORD'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          error: 'User already exists with this email',
          code: 'USER_EXISTS'
        });
        return;
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await UserModel.create(email, passwordHash);

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email
      });
      
      const refreshTokenValue = generateRefreshToken();
      const refreshTokenHash = await hashRefreshToken(refreshTokenValue);
      const refreshTokenExpiry = getRefreshTokenExpiry();
      
      await RefreshTokenModel.create(user.id, refreshTokenHash, refreshTokenExpiry);

      // Log successful registration
      console.log(`User registered: ${email} (ID: ${user.id})`);

      res.status(201).json({
        message: 'User registered successfully',
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const { email, password } = value;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(user.password_hash, password);
      if (!isValidPassword) {
        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Generate tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email
      });
      
      const refreshTokenValue = generateRefreshToken();
      const refreshTokenHash = await hashRefreshToken(refreshTokenValue);
      const refreshTokenExpiry = getRefreshTokenExpiry();
      
      await RefreshTokenModel.create(user.id, refreshTokenHash, refreshTokenExpiry);

      // Log successful login
      console.log(`User logged in: ${email} (ID: ${user.id})`);

      res.status(200).json({
        message: 'Login successful',
        accessToken,
        refreshToken: refreshTokenValue,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = refreshSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const { refreshToken } = value;

      // Hash the provided refresh token
      const refreshTokenHash = await hashRefreshToken(refreshToken);

      // Find the refresh token in database
      const storedToken = await RefreshTokenModel.findByTokenHash(refreshTokenHash);
      if (!storedToken) {
        res.status(401).json({
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        });
        return;
      }

      // Get user details
      const user = await UserModel.findById(storedToken.user_id);
      if (!user) {
        res.status(401).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Revoke the old refresh token (token rotation)
      await RefreshTokenModel.revoke(storedToken.id);

      // Generate new tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email
      });
      
      const newRefreshTokenValue = generateRefreshToken();
      const newRefreshTokenHash = await hashRefreshToken(newRefreshTokenValue);
      const refreshTokenExpiry = getRefreshTokenExpiry();
      
      await RefreshTokenModel.create(user.id, newRefreshTokenHash, refreshTokenExpiry);

      // Log successful token refresh
      console.log(`Token refreshed for user: ${user.email} (ID: ${user.id})`);

      res.status(200).json({
        message: 'Token refreshed successfully',
        accessToken,
        refreshToken: newRefreshTokenValue,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke specific refresh token
        const refreshTokenHash = await hashRefreshToken(refreshToken);
        await RefreshTokenModel.revokeByTokenHash(refreshTokenHash);
      }

      // If user is authenticated (has access token), revoke all their tokens
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        await RefreshTokenModel.revokeAllForUser(authReq.user.id);
        console.log(`All tokens revoked for user: ${authReq.user.email} (ID: ${authReq.user.id})`);
      }

      res.status(200).json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  static async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const activeTokens = await RefreshTokenModel.findActiveByUserId(req.user.id);
      
      const sessions = activeTokens.map(token => ({
        id: token.id,
        createdAt: token.created_at,
        expiresAt: token.expires_at
      }));

      res.status(200).json({
        sessions,
        total: sessions.length
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}