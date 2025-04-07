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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";

const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, checkSession } = useAuth();
  
  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      await checkSession();
      
      // If user is not authenticated or already has firstName, redirect to dashboard
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "You need to be logged in to access this page.",
          variant: "destructive"
        });
        setLocation("/login");
      } else if (user.firstName) {
        // User already has a firstName, redirect to dashboard
        setLocation("/dashboard");
      }
    };
    
    checkAuth();
  }, [user, checkSession, setLocation, toast]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: ""
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Update user profile with first and last name
      const response = await apiRequest(
        "PATCH",
        "/api/users/profile",
        data
      );
      
      if (response && response.message) {
        // Force a session check to update user data
        await checkSession();
        
        toast({
          title: "Profile Updated",
          description: "Your profile information has been updated.",
        });
        
        // Redirect to dashboard after successful update
        setLocation("/dashboard");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 bg-background">
      <div className="w-full max-w-md px-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>
              Please provide your full name to complete your profile
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your first name"
                          autoComplete="given-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your last name"
                          autoComplete="family-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save and Continue"}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center text-sm text-muted-foreground">
            This information will be displayed on your profile
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}