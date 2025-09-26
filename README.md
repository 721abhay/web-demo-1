# Habit Tracker Backend

A secure authentication system for a habit-tracking application built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

### 🔐 Secure Authentication System
- **Password Security**: Argon2 password hashing with secure defaults
- **JWT Access Tokens**: Short-lived (15 minutes) access tokens
- **Refresh Token Rotation**: Secure refresh token rotation with database storage
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive request validation with Joi

### 🛡️ Security Features
- **Token Revocation**: Individual and bulk token revocation
- **Session Management**: Track and manage active user sessions
- **Secure Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policies
- **Environment-based Configuration**: Secure secret management

### 🚀 API Endpoints

#### Authentication Routes
- `POST /auth/register` - User registration
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh with rotation
- `POST /auth/logout` - Token revocation
- `GET /auth/sessions` - List active sessions (protected)

#### Protected Routes (Examples)
- `GET /habits` - Protected habits endpoint
- `GET /today` - Protected today endpoint
- `GET /health` - Health check endpoint

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-demo-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and secrets
   ```

4. **Database Setup**
   ```bash
   # Create your PostgreSQL database
   createdb habit_tracker
   
   # Run migrations
   npm run migrate:up
   ```

5. **Build and Start**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

### Testing
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Linting
npm run lint
npm run lint:fix
```

## API Usage Examples

### Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "SecurePass123!"
  }'
```

### Using Protected Routes
```bash
curl -X GET http://localhost:3000/habits \
  -H "Authorization: Bearer <your-access-token>"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<your-refresh-token>"
  }'
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE NULL
);
```

## Security Considerations

- **Password Requirements**: Minimum 8 characters with uppercase, lowercase, and numbers
- **Rate Limiting**: 
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 attempts per 15 minutes
  - Registration: 3 attempts per hour
- **Token Security**:
  - Access tokens: 15-minute expiry
  - Refresh tokens: 7-day expiry with rotation
  - All refresh tokens stored hashed in database
- **Environment Variables**: All secrets must be properly configured in production

## Development

### Project Structure
```
src/
├── config/         # Database and configuration
├── controllers/    # Route controllers
├── middleware/     # Express middleware
├── models/         # Database models
├── routes/         # Route definitions  
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── migrations/     # Database migrations
└── __tests__/      # Test files
```

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run Jest tests
- `npm run migrate:up` - Run database migrations
- `npm run migrate:down` - Rollback migrations

## Frontend Integration

The authentication system is designed to work with a React frontend using:

1. **AuthContext** for state management
2. **HTTP interceptors** for automatic token refresh
3. **Secure token storage** (memory for access tokens, httpOnly cookies for refresh tokens)

Example frontend integration patterns are included in the documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality  
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.