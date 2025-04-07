import React, { useEffect } from "react";
import { useLocation } from "wouter";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import RegistrationForm from "../components/ui/registration-form";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";

export default function Register() {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is already authenticated - run once at mount
  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;
    
    const checkAuth = async () => {
      // Only proceed if the component is still mounted
      if (!isMounted) return;
      
      await checkSession();
      
      // After session check, verify component is still mounted before updates
      if (!isMounted) return;
      
      // If user is already authenticated, redirect to dashboard once
      if (isAuthenticated && !isLoading) {
        toast({
          title: "Already Logged In",
          description: "You are already registered and logged in.",
        });
        
        // Use replace to avoid adding to history stack
        window.history.replaceState({}, document.title, '/dashboard');
        setLocation("/dashboard", { replace: true });
      }
    };
    
    // Small delay to prevent race conditions
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 100);
    
    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <RegistrationForm />
      </main>
      <Footer />
    </div>
  );
}