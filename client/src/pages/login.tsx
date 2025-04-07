import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { User } from "@shared/schema";
import { Separator } from "../components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading: authLoading, checkSession } = useAuth();
  
  // Check if user is already authenticated
  // This effect will run only once when the component mounts
  useEffect(() => {
    // Flag to track if component is mounted
    let isMounted = true;
    
    const checkAuth = async () => {
      // Only proceed if the component is still mounted
      if (!isMounted) return;
      
      // Check authentication status
      await checkSession();
      
      // After session check, verify component is still mounted before state updates
      if (!isMounted) return;
      
      // If user is already authenticated, redirect to dashboard - but only once
      if (isAuthenticated && !authLoading) {
        // Clear any pending navigation attempts
        if (window.history.state && window.history.state.key) {
          // Only show toast and redirect if we haven't already
          toast({
            title: "Already Logged In",
            description: "You are already logged in.",
          });
          
          // Use replace instead of push to avoid adding to history stack
          window.history.replaceState({}, document.title, '/dashboard');
          setLocation("/dashboard", { replace: true });
        }
      }
    };
    
    // Execute the check once with a small delay to prevent initial loading race conditions
    const timeoutId = setTimeout(() => {
      checkAuth();
    }, 100);
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Check for error params in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (success === 'true') {
      toast({
        title: 'Authentication Successful',
        description: 'You have been logged in successfully.',
      });
      
      // Clean up the URL and redirect to dashboard
      window.history.replaceState({}, document.title, '/dashboard');
      setLocation("/dashboard");
      return;
    }
    
    if (error) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      if (error === 'google_auth_failed') {
        errorMessage = 'Google authentication failed. Please try again.';
      } else if (error === 'google_no_user') {
        errorMessage = 'Could not retrieve user info from Google.';
      } else if (error === 'login_failed') {
        errorMessage = 'Login failed after authentication. Please try again.';
      }
      
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive'
      });
      
      // Clean up the URL
      window.history.replaceState({}, document.title, '/login');
    }
  }, [location, toast, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Call the server to login using the passport-configured endpoint
      const response = await apiRequest("POST", "/api/auth/login", data);
      
      // If successful, update the auth context
      if (response && response.success && response.user) {
        login(response.user as User);
        
        toast({
          title: "Login Successful",
          description: "You have been logged in successfully.",
        });
        
        // Verify the authentication state with the server
        await checkSession();
        
        // Redirect to dashboard after successful login
        setLocation("/dashboard");
      } else {
        console.error("Login response incomplete:", response);
        toast({
          title: "Login Failed",
          description: response?.message || "Authentication failed - please try again",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 bg-background">
      <div className="w-full max-w-md space-y-8 px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-8 bg-card p-8 shadow-lg rounded-lg border border-border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="you@example.com" 
                        type="email" 
                        autoComplete="email"
                        inputMode="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="••••••••" 
                        type="password" 
                        autoComplete="current-password"
                        inputMode="text"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6">
            <Separator className="my-4">
              <span className="mx-2 text-xs text-muted-foreground">OR CONTINUE WITH</span>
            </Separator>
            
            <div className="flex gap-4 mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = "/api/auth/google";
                }}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Google
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = "/api/auth/apple";
                }}
                disabled={true} // Disabled until Apple auth is configured
              >
                <SiApple className="mr-2 h-5 w-5" />
                Apple
              </Button>
            </div>
            
            <div className="mt-4 flex gap-4">
              <Button
                variant="default"
                className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  setLocation("/test-login");
                }}
              >
                משתמש בדיקה
              </Button>
              
              <Button
                variant="default"
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    // Call admin login endpoint
                    const response = await apiRequest("POST", "/api/auth/login-as-admin");
                    
                    if (response && response.success) {
                      // Set the X-Test-Admin header in localStorage for future requests
                      localStorage.setItem('x-test-admin', 'true');
                      
                      // Store the session ID
                      if (response.sessionID) {
                        localStorage.setItem('sessionID', response.sessionID);
                      }
                      
                      // Also store the user object
                      if (response.user) {
                        localStorage.setItem('admin-user', JSON.stringify(response.user));
                      }
                      
                      // Refresh session after admin login
                      await checkSession();
                      
                      toast({
                        title: "Admin Login Successful",
                        description: "You have been logged in as administrator.",
                      });
                      
                      // Redirect to dashboard
                      setLocation("/dashboard");
                    }
                  } catch (error) {
                    console.error("Admin login error:", error);
                    toast({
                      title: "Admin Login Failed",
                      description: error instanceof Error ? error.message : "An unknown error occurred",
                      variant: "destructive"
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                התחבר כמנהל
              </Button>
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <a href="/register" className="font-medium text-primary hover:text-primary/90">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}