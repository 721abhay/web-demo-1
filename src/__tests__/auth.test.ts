import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  validateEmail,
  validatePassword
} from '../utils/auth';

describe('Authentication Utils', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(hash, wrongPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Tokens', () => {
    it('should generate and verify access token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const decoded = verifyAccessToken(token);
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = verifyAccessToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('Refresh Tokens', () => {
    it('should generate refresh token', () => {
      const token = generateRefreshToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(128); // 64 bytes in hex = 128 characters
    });

    it('should hash refresh token consistently', async () => {
      const token = generateRefreshToken();
      const hash1 = await hashRefreshToken(token);
      const hash2 = await hashRefreshToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@domain.org'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'AnotherGood1',
        'MySecure2024'
      ];
      
      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',           // too short
        'nouppercase123',  // no uppercase
        'NOLOWERCASE123',  // no lowercase
        'NoNumbers!',      // no numbers
      ];
      
      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});