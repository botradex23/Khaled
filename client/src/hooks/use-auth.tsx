import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
      const response = await apiRequest("GET", "/api/auth/user");
      
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
      localStorage.removeItem("user");
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