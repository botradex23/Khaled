import { useState } from "react";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Checkbox } from "./checkbox";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "../../hooks/use-toast";
import { useAuth } from "../../hooks/use-auth";
import { User } from "@shared/schema";
import { Separator } from "./separator";
import { FcGoogle } from "react-icons/fc";
import { SiApple } from "react-icons/si";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/^[a-zA-Z0-9]+$/, "Password must contain only English letters and numbers"),
  terms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions"
  })
});

type FormValues = z.infer<typeof formSchema>;

export default function RegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      terms: false
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Register user using the passport-configured auth endpoint
      const response = await apiRequest<{ success: boolean, user: User }>(
        "POST",
        "/api/auth/register",
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password
        }
      );

      // Login the user if we have a user in response
      if (response && response.user) {
        login(response.user);
      }

      toast({
        title: "Registration successful!",
        description: "Your account has been created. You're now logged in.",
        variant: "default",
      });

      // Redirect to dashboard after successful registration
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error) {
      console.error("Registration error:", error);
      
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-card py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Get Started Today</h2>
          <p className="text-muted-foreground">
            Create your account in minutes and start trading with our automated bots.
          </p>
        </div>
        
        <Card className="gradient-border">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your first name" 
                            className="bg-background border-border focus:border-primary"
                            inputMode="text"
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
                            className="bg-background border-border focus:border-primary"
                            inputMode="text"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email" 
                          className="bg-background border-border focus:border-primary"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
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
                          type="password" 
                          placeholder="Create a password" 
                          className="bg-background border-border focus:border-primary"
                          inputMode="text"
                          autoComplete="new-password"
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-muted-foreground text-xs mt-2">
                        Password must be at least 8 characters with a number, one uppercase letter, and only English letters and numbers.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I agree to the{" "}
                          <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
                          {" "}and{" "}
                          <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
                
                <Separator className="my-6">
                  <span className="mx-2 text-xs text-muted-foreground">OR SIGN UP WITH</span>
                </Separator>
                
                <div className="flex gap-4">
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
                
                <div className="text-center text-muted-foreground text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
