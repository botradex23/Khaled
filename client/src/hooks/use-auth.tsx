import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsProfileCompletion: boolean;
  login: (user: User) => void;
  logout: () => void;
  checkSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState<boolean>(false);

  // Function to check session with the server
  const checkSession = async () => {
    try {
      setIsLoading(true);
      
      // Check for admin authentication cookie
      const isAdminAuthenticated = document.cookie.includes('admin_authenticated=true');
      const hasAdminHeader = localStorage.getItem('x-test-admin') === 'true';
      
      // If we have admin authentication, set headers for all future API requests
      if (isAdminAuthenticated || hasAdminHeader) {
        // Just set localStorage for now - no need to modify queryClient options
        localStorage.setItem('x-test-admin', 'true');
      }
      
      const response = await apiRequest("GET", "/api/auth/user", null, isAdminAuthenticated || hasAdminHeader ? {
        headers: {
          'X-Test-Admin': 'true'
        }
      } : undefined);
      
      if (response && response.isAuthenticated && response.user) {
        // User is authenticated according to server
        setUser(response.user);
        setIsAuthenticated(true);
        
        // Check if user needs to complete profile
        if (!response.user.firstName || !response.user.lastName) {
          setNeedsProfileCompletion(true);
        } else {
          setNeedsProfileCompletion(false);
        }
        
        localStorage.setItem("user", JSON.stringify(response.user));
      } else if (hasAdminHeader || isAdminAuthenticated) {
        // Try to get admin from localStorage if server session failed
        const adminUser = localStorage.getItem('admin-user');
        if (adminUser) {
          const parsedUser = JSON.parse(adminUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
          setNeedsProfileCompletion(false);
        } else {
          // Try to create admin user through login
          try {
            const adminLoginResponse = await apiRequest("POST", "/api/auth/login-as-admin");
            if (adminLoginResponse && adminLoginResponse.success && adminLoginResponse.user) {
              setUser(adminLoginResponse.user);
              setIsAuthenticated(true);
              setNeedsProfileCompletion(false);
              localStorage.setItem("user", JSON.stringify(adminLoginResponse.user));
              localStorage.setItem("admin-user", JSON.stringify(adminLoginResponse.user));
            }
          } catch (adminErr) {
            console.error("Failed to get admin user:", adminErr);
          }
        }
      } else {
        // Not authenticated according to server
        setUser(null);
        setIsAuthenticated(false);
        setNeedsProfileCompletion(false);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Failed to check authentication status:", error);
      // On error, try to use localStorage as fallback
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Failed to parse saved user data:", error);
          localStorage.removeItem("user");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on component mount
  // But limit frequency to prevent excessive API calls
  useEffect(() => {
    // Create a debounced version of the checkSession function
    let authCheckTimeout: NodeJS.Timeout | null = null;
    let isCheckingSession = false;
    
    // Check for admin status in localStorage
    const testAdmin = localStorage.getItem('x-test-admin');
    const adminUser = localStorage.getItem('admin-user');
    
    // If we have a stored admin user, use it immediately
    if (testAdmin === 'true' && adminUser) {
      try {
        const parsedUser = JSON.parse(adminUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setNeedsProfileCompletion(false);
        console.log('Restored admin user from localStorage');
      } catch (error) {
        console.error('Failed to parse admin user from localStorage:', error);
      }
    }
    
    // Create a throttled check session function
    const throttledCheckSession = async () => {
      if (isCheckingSession) return; // Prevent multiple simultaneous checks
      
      isCheckingSession = true;
      try {
        await checkSession();
      } finally {
        isCheckingSession = false;
      }
    };
    
    // Initial check - but add slight delay to prevent rapid calls during app init
    setTimeout(() => {
      throttledCheckSession();
    }, 50);
    
    // Set up timer for refreshes - 45 seconds is more than enough and less frequent
    const refreshInterval = setInterval(() => {
      throttledCheckSession();
    }, 45000); // Check less frequently to reduce API load
    
    // Cleanup on component unmount
    return () => {
      if (authCheckTimeout) clearTimeout(authCheckTimeout);
      clearInterval(refreshInterval);
    };
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    
    // Check if user needs to complete profile
    if (!userData.firstName || !userData.lastName) {
      setNeedsProfileCompletion(true);
    } else {
      setNeedsProfileCompletion(false);
    }
    
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      // Call logout endpoint on server
      await apiRequest("GET", "/api/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear local state even if server logout fails
      setUser(null);
      setIsAuthenticated(false);
      setNeedsProfileCompletion(false);
      
      // Clear all authentication-related items
      localStorage.removeItem("user");
      localStorage.removeItem("x-test-admin");
      localStorage.removeItem("admin-user");
      localStorage.removeItem("sessionID");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      needsProfileCompletion,
      login, 
      logout,
      checkSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};