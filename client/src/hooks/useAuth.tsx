import React from "react";
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  isAdmin?: boolean;
  hasPremium?: boolean;
  
  // API keys
  binanceApiKey?: string | null;
  binanceSecretKey?: string | null;
  binanceAllowedIp?: string | null;
  
  // Other properties
  defaultBroker?: string;
  useTestnet?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<boolean>;
}

// יצירת קונטקסט עבור אימות משתמשים
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ספק (Provider) עבור הקונטקסט
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // בדיקת סטטוס אימות בטעינה ראשונית
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/user');
        const data = await response.json();
        
        if (data.isAuthenticated && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // פונקצית כניסה למערכת
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };
  
  // פונקצית יציאה מהמערכת
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'GET' });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // עדכון פרטי המשתמש
  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      const responseData = await response.json();
      
      if (response.ok && responseData.success) {
        // עדכון המשתמש המקומי רק אם העדכון בשרת הצליח
        setUser(prev => prev ? { ...prev, ...data } : null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  };
  
  // ערכי האובייקט שיועברו דרך הקונטקסט
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    updateUser,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// הוק שמחזיר את ערכי הקונטקסט
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}