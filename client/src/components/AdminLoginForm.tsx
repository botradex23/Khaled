import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

export function AdminLoginForm({ onLoginSuccess }: { onLoginSuccess: (userData: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both email and password',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/auth/login-as-admin', {
        email,
        password,
      });
      
      if (response.success) {
        // Store the X-Test-Admin header in localStorage for future requests
        localStorage.setItem('isAdmin', 'true');
        
        // Show success message
        toast({
          title: 'Login Successful',
          description: 'You are now logged in as an admin',
        });
        
        // Pass user data to parent component
        onLoginSuccess(response.user);
      } else {
        toast({
          title: 'Login Failed',
          description: response.message || 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Admin Login</CardTitle>
        <CardDescription>
          Enter your credentials to access the admin panel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            setEmail('admin@example.com');
            setPassword('');
          }}
        >
          Use Default Admin
        </Button>
        <Button 
          variant="link" 
          onClick={async () => {
            try {
              setIsLoading(true);
              const response = await apiRequest('POST', '/api/auth/create-default-admin', {});
              
              if (response.success) {
                toast({
                  title: 'Default Admin Created',
                  description: `Email: ${response.admin.email}, Password: ${response.admin.password}`,
                });
                setEmail(response.admin.email);
                setPassword(response.admin.password);
              } else {
                toast({
                  title: 'Error',
                  description: response.message || 'Failed to create default admin',
                  variant: 'destructive',
                });
              }
            } catch (error) {
              console.error('Error creating default admin:', error);
              toast({
                title: 'Error',
                description: 'Failed to create default admin account',
                variant: 'destructive',
              });
            } finally {
              setIsLoading(false);
            }
          }}
        >
          Create Default Admin
        </Button>
      </CardFooter>
    </Card>
  );
}