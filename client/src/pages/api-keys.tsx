import React, { useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import { apiRequest } from "../lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Switch } from "../components/ui/switch";
import { 
  ArrowRight, 
  KeyRound, 
  AlertCircle, 
  Check, 
  Lock, 
  Shield, 
  Loader2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Zap
} from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog.tsx";
import { Badge } from "../components/ui/badge";
// We're using a local version of Layout
// import Layout from "../components/layout";

// Temporary inline Layout component to avoid import error
const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <main className="min-h-screen">{children}</main>
    </div>
  );
};

interface ApiKeyFormValues {
  binanceApiKey: string;
  binanceSecretKey: string;
  defaultBroker: string;
  useTestnet: boolean;
}

export default function ApiKeys() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [formValues, setFormValues] = useState<ApiKeyFormValues>({
    binanceApiKey: "",
    binanceSecretKey: "",
    defaultBroker: "binance",
    useTestnet: true
  });
  const [isHindi1000Hindi, setIsHindi1000Hindi] = useState(false);
  
  // API Key validation states
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean | null;
    message: string;
  }>({ isValid: null, message: "" });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
    
    // No longer checking for special user - all users should be able to enter API keys
    setIsHindi1000Hindi(false);
  }, [isAuthenticated, navigate]);

  // Define API keys response type
  interface ApiKeysResponse {
    message: string;
    apiKeys: {
      binanceApiKey: string | null;
      binanceSecretKey: string | null;
      defaultBroker: string;
      useTestnet: boolean;
    };
  }

  // Fetch current API keys (masked)
  const { data: apiKeysData, isLoading: isLoadingKeys } = useQuery<ApiKeysResponse>({
    queryKey: ["/api/users/api-keys"],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    // This is needed to get proper typing
    select: (data: any) => data as ApiKeysResponse
  });

  // Update form with current values (masked)
  useEffect(() => {
    console.log("API keys data for form:", apiKeysData);
    
    if (apiKeysData?.apiKeys) {
      const formData = {
        binanceApiKey: apiKeysData.apiKeys.binanceApiKey ?? "",
        binanceSecretKey: apiKeysData.apiKeys.binanceSecretKey ?? "",
        defaultBroker: apiKeysData.apiKeys.defaultBroker || "binance",
        useTestnet: apiKeysData.apiKeys.useTestnet !== undefined ? apiKeysData.apiKeys.useTestnet : true
      };
      
      console.log("Setting form values:", formData);
      setFormValues(formData);
    }
  }, [apiKeysData]);

  // Mutation to update API keys
  const updateMutation = useMutation({
    mutationFn: async (data: ApiKeyFormValues) => {
      try {
        console.log("Sending API key update request with data:", {
          hasApiKey: !!data.binanceApiKey,
          hasSecretKey: !!data.binanceSecretKey,
          defaultBroker: data.defaultBroker,
          useTestnet: data.useTestnet
        });
        
        // apiRequest כבר מחזיר את אובייקט ה-JSON ולא את Response
        // אם יש שגיאה, הפונקציה תזרוק אותה אוטומטית
        const result = await apiRequest("PUT", "/api/users/api-keys", data);
        console.log("API key update success response:", result);
        return result;
      } catch (err) {
        console.error("API Key update error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "API Keys Updated",
        description: "Your API keys have been successfully updated.",
      });
      
      // ניווט לדף הראשי/Dashboard אחרי העדכון המוצלח
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000); // המתנה של שנייה אחת כדי שהמשתמש יראה את הודעת ההצלחה
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete API keys
  const deleteMutation = useMutation({
    mutationFn: async () => {
      try {
        // apiRequest כבר מחזיר את אובייקט ה-JSON ולא את Response
        // אם יש שגיאה, הפונקציה תזרוק אותה אוטומטית
        return await apiRequest("DELETE", "/api/users/api-keys");
      } catch (err) {
        console.error("API Key deletion error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "API Keys Deleted",
        description: "Your API keys have been successfully deleted.",
      });
      
      // Reset form
      setFormValues({
        binanceApiKey: "",
        binanceSecretKey: "",
        defaultBroker: "binance",
        useTestnet: true
      });
      
      // ניווט לדף הראשי/Dashboard אחרי המחיקה המוצלחת
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000); // המתנה של שנייה אחת כדי שהמשתמש יראה את הודעת ההצלחה
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormValues({
      ...formValues,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // API key validation is now done directly in the validateApiKeys function
  // So this mutation is no longer needed
  
  const validateApiKeys = async () => {
    // Check if any API keys are missing or just empty strings (after trimming)
    if (!formValues.binanceApiKey?.trim() || !formValues.binanceSecretKey?.trim()) {
      setValidationResult({
        isValid: false,
        message: "Please fill in all API key fields - empty values are not allowed"
      });
      return false;
    }
    
    setIsValidating(true);
    setValidationResult({ isValid: null, message: "Validating API keys..." });
    
    try {
      console.log("Validating API keys with /api/validate-api-keys endpoint");
      const response = await apiRequest("POST", "/api/validate-api-keys", {
        binanceApiKey: formValues.binanceApiKey,
        binanceSecretKey: formValues.binanceSecretKey,
        useTestnet: formValues.useTestnet
      });
      
      if (response.success) {
        setValidationResult({ 
          isValid: true, 
          message: `API keys validated successfully! ${response.demo ? '(Demo Mode)' : '(Live Mode)'}`
        });
        
        // After successful validation, update the API keys
        updateMutation.mutate(formValues);
        return true;
      } else {
        setValidationResult({ 
          isValid: false, 
          message: response.message || "API key validation failed. Please check your credentials." 
        });
        
        toast({
          title: "API Key Validation Failed",
          description: response.message || "Invalid API credentials. Please check your keys and try again.",
          variant: "destructive",
        });
        
        return false;
      }
    } catch (error) {
      console.error("API key validation error:", error);
      setValidationResult({ 
        isValid: false, 
        message: error instanceof Error ? error.message : "An unexpected error occurred during validation." 
      });
      
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate API keys. Please try again.",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs for all users - check if any field is empty or contains only whitespace
    if (!formValues.binanceApiKey?.trim() || !formValues.binanceSecretKey?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }
    
    // First validate the API keys
    const isValid = await validateApiKeys();
    
    // If validation is successful, the update will be triggered in the onSuccess handler
    // If not, validation errors will be shown to the user
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormValues({
      ...formValues,
      useTestnet: checked,
    });
  };
  
  // אנחנו לא רוצים העתקת מפתחות אדמין!

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-4">API Key Management</h1>
        
        {/* Important notice about API keys */}
        <div className="mb-8 p-4 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-start mb-3">
            <AlertTriangle className="h-5 w-5 text-primary mt-0.5 mr-2" />
            <h2 className="text-lg font-semibold text-primary">API Keys Importance</h2>
          </div>
          <p className="mb-2 text-sm">
            To access your personal account data and enable automated trading functions, you must set up your Binance API keys.
            <strong> Without these keys, you won't be able to view your actual balance, perform trading operations, or run automated bots.</strong>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-white/60 p-3 rounded-md shadow-sm">
              <div className="flex items-center mb-2">
                <KeyRound className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-sm">Private Access</span>
              </div>
              <p className="text-xs text-gray-600">Each user must configure their personal API keys to access their account data.</p>
            </div>
            <div className="bg-white/60 p-3 rounded-md shadow-sm">
              <div className="flex items-center mb-2">
                <Lock className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-sm">Full Security</span>
              </div>
              <p className="text-xs text-gray-600">Your keys are encrypted and secured, used only for your account operations.</p>
            </div>
            <div className="bg-white/60 p-3 rounded-md shadow-sm">
              <div className="flex items-center mb-2">
                <Zap className="h-4 w-4 text-primary mr-2" />
                <span className="font-medium text-sm">Automated Trading</span>
              </div>
              <p className="text-xs text-gray-600">Automated bots can only operate with valid API keys that have been properly configured.</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="binance" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="binance">Binance Exchange</TabsTrigger>
          </TabsList>
          
          <TabsContent value="binance">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <KeyRound className="mr-2 h-5 w-5" />
                      Binance API Credentials
                    </CardTitle>
                    <CardDescription>
                      <span>Enter your Binance API credentials to enable trading.</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <form onSubmit={handleSubmit}>
                      {/* API Key validation status message */}
                      {(validationResult.isValid !== null || isValidating) && (
                        <div className={`p-3 mb-4 rounded-md ${
                          isValidating 
                            ? "bg-blue-50 border border-blue-200" 
                            : validationResult.isValid 
                              ? "bg-green-50 border border-green-200" 
                              : "bg-red-50 border border-red-200"
                        }`}>
                          <div className="flex items-center">
                            {isValidating && (
                              <Loader2 className="animate-spin h-4 w-4 mr-2 text-blue-500" />
                            )}
                            
                            {!isValidating && validationResult.isValid === true && (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            )}
                            
                            {!isValidating && validationResult.isValid === false && (
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            
                            <span className={`text-sm ${
                              isValidating 
                                ? "text-blue-600" 
                                : validationResult.isValid 
                                  ? "text-green-600" 
                                  : "text-red-600"
                            }`}>
                              {validationResult.message}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="binanceApiKey">API Key</Label>
                          <Input
                            id="binanceApiKey"
                            name="binanceApiKey"
                            type="text"
                            placeholder="Enter your Binance API Key"
                            value={formValues.binanceApiKey}
                            onChange={handleInputChange}
                            disabled={updateMutation.isPending || isValidating}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="binanceSecretKey">Secret Key</Label>
                          <Input
                            id="binanceSecretKey"
                            name="binanceSecretKey"
                            type="password"
                            placeholder="Enter your Binance Secret Key"
                            value={formValues.binanceSecretKey}
                            onChange={handleInputChange}
                            disabled={updateMutation.isPending || isValidating}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="useTestnet">Use Demo Trading</Label>
                            <Switch
                              id="useTestnet"
                              name="useTestnet"
                              checked={formValues.useTestnet}
                              onCheckedChange={handleSwitchChange}
                              disabled={updateMutation.isPending}
                            />
                          </div>
                          <p className="text-sm text-gray-500">
                            {formValues.useTestnet 
                              ? "Demo trading is enabled. No real funds will be used." 
                              : "Live trading is enabled. Real funds will be used."}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between mt-6">
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending || isValidating}
                          className="flex items-center"
                        >
                          {updateMutation.isPending ? "Saving..." : isValidating ? "Validating..." : "Save API Keys"}
                          {!updateMutation.isPending && !isValidating && <ArrowRight className="ml-2 h-4 w-4" />}
                          {isValidating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              type="button"
                              disabled={deleteMutation.isPending || isLoadingKeys}
                            >
                              {deleteMutation.isPending ? "Deleting..." : "Delete API Keys"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete your API keys. You will need to re-enter them to continue trading.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5" />
                      API Key Permissions
                    </CardTitle>
                    <CardDescription>
                      Required permissions for your Binance API key
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-2">Required Permissions</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center">
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            <span>Enable Reading</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="mr-2 h-4 w-4 text-green-500" />
                            <span>Enable Spot & Margin Trading</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Optional Permissions</h3>
                        <ul className="space-y-2">
                          <li className="flex items-center">
                            <Check className="mr-2 h-4 w-4 text-blue-400" />
                            <span>Enable Futures</span>
                          </li>
                          <li className="flex items-center">
                            <Check className="mr-2 h-4 w-4 text-blue-400" />
                            <span>Enable Withdrawals</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">API Creation Instructions</h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>Log in to your Binance account</li>
                          <li>Go to "API Management" (found under your profile)</li>
                          <li>Click "Create API"</li>
                          <li>Complete security verification if prompted</li>
                          <li>Label your API key for this application</li>
                          <li>Set IP restriction for enhanced security (recommended)</li>
                          <li>Enable the required permissions (Reading and Trading)</li>
                          <li>Save and record your API Key and Secret Key</li>
                        </ol>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center text-amber-600 mb-2">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          <h3 className="text-sm font-medium">Security Notice</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          Your API keys are securely stored and only used for executing trades on your behalf.
                          We recommend using API keys with appropriate permissions and IP restrictions.
                          Never share your API keys with unauthorized parties.
                        </p>
                      </div>
                      
                      <div className="pt-2">
                        <Badge variant="outline" className="flex items-center w-fit">
                          <Lock className="mr-1 h-3 w-3" />
                          End-to-end encrypted
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}