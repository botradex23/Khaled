import { useEffect } from "react";
import { useLocation } from "wouter";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import RegistrationForm from "@/components/ui/registration-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const { isAuthenticated, isLoading, checkSession } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      await checkSession();
      
      // If user is already authenticated, redirect to dashboard
      if (isAuthenticated && !isLoading) {
        toast({
          title: "Already Logged In",
          description: "You are already registered and logged in.",
        });
        setLocation("/dashboard");
      }
    };
    
    checkAuth();
  }, [isAuthenticated, isLoading, checkSession, setLocation, toast]);
  
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