import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { UserModel } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Verify user still exists
    const user = await UserModel.findById(payload.userId);
    if (!user) {
      res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    
    if (payload) {
      const user = await UserModel.findById(payload.userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail on optional auth errors
    next();
  }
};