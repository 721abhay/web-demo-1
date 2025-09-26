# Frontend Integration Guide

This guide shows how to integrate the authentication system with a React frontend.

## AuthContext Setup

```tsx
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for refresh token
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    
    // Store refresh token in httpOnly cookie (handled by server)
    // Access token stays in memory for security
  };

  const register = async (email: string, password: string) => {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) return false;

      const data = await response.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      login,
      register,
      logout,
      refreshToken,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## HTTP Client with Auto-Refresh

```tsx
// utils/httpClient.ts
import { useAuth } from '../contexts/AuthContext';

class HttpClient {
  private accessToken: string | null = null;
  private refreshTokenFn: (() => Promise<boolean>) | null = null;

  setAuth(token: string | null, refreshFn: () => Promise<boolean>) {
    this.accessToken = token;
    this.refreshTokenFn = refreshFn;
  }

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    // Add Authorization header if token exists
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` })
    };

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    // If unauthorized and we have a refresh function, try to refresh
    if (response.status === 401 && this.refreshTokenFn) {
      const refreshed = await this.refreshTokenFn();
      
      if (refreshed) {
        // Retry the original request with new token
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${this.accessToken}`
        };
        
        response = await fetch(url, {
          ...options,
          headers: newHeaders,
          credentials: 'include'
        });
      }
    }

    return response;
  }

  async get(url: string) {
    return this.request(url, { method: 'GET' });
  }

  async post(url: string, data?: any) {
    return this.request(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(url: string, data?: any) {
    return this.request(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(url: string) {
    return this.request(url, { method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();

// Hook to configure the HTTP client with auth
export const useHttpClient = () => {
  const { accessToken, refreshToken } = useAuth();
  
  React.useEffect(() => {
    httpClient.setAuth(accessToken, refreshToken);
  }, [accessToken, refreshToken]);

  return httpClient;
};
```

## Security Best Practices

1. **Access Token Storage**: Keep in memory only (React state)
2. **Refresh Token Storage**: Use httpOnly cookies when possible
3. **HTTPS Only**: Always use HTTPS in production
4. **Token Expiry**: Handle token expiry gracefully with auto-refresh
5. **Logout**: Clear all tokens and cookies on logout
6. **Error Handling**: Provide user-friendly error messages
7. **Loading States**: Show loading indicators during auth operations