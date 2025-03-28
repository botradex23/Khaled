import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function TestLogin() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  // Users for testing
  const testUsers = [
    { id: 1, name: "משתמש ראשון - ללא API keys" },
    { id: 2, name: "משתמש שני - OKX API keys" },
    { id: 3, name: "משתמש שלישי - OKX API keys אחרים" }
  ];

  const handleSelectUser = async (userId: number) => {
    setLoading(true);
    try {
      // Log in as test user
      const response = await apiRequest("POST", "/api/auth/test-login", { userId });
      
      if (response && response.user) {
        login(response.user);
        
        toast({
          title: "התחברות מוצלחת",
          description: `התחברת בהצלחה כמשתמש בדיקה ${userId}`,
        });
        
        // Use replace to avoid adding to history stack
        window.history.replaceState({}, document.title, '/dashboard');
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "התחברות נכשלה",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">התחברות למשתמש בדיקה</CardTitle>
          <CardDescription className="text-center">
            בחר משתמש בדיקה כדי לראות את המערכת עם נתונים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {testUsers.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="w-full justify-between h-14 text-lg"
              disabled={loading}
              onClick={() => handleSelectUser(user.id)}
            >
              {user.name}
            </Button>
          ))}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            חזרה לעמוד התחברות רגיל
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}