import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { SiBinance } from "react-icons/si";
import AppSidebar from "@/components/AppSidebar";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CreditCard,
  KeyRound,
  Loader2,
  BarChart3,
  Bot,
  GanttChart,
  Shield,
  LockKeyhole,
  SlidersHorizontal
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Define schema for Binance API key form
const binanceApiKeySchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required" }),
  secretKey: z.string().min(1, { message: "Secret Key is required" }),
  testnet: z.boolean().default(true),
});

export default function BinancePage() {
  const { isAuthenticated, isLoading: authLoading, checkSession } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSuccessfullySet, setHasSuccessfullySet] = useState(false);
  
  // Initialize form
  const form = useForm<z.infer<typeof binanceApiKeySchema>>({
    resolver: zodResolver(binanceApiKeySchema),
    defaultValues: {
      apiKey: "",
      secretKey: "",
      testnet: true,
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    const verifyAuth = async () => {
      await checkSession();
      
      if (!isAuthenticated && !authLoading) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access the Binance integration.",
          variant: "destructive"
        });
        setLocation("/login");
      }
    };
    
    verifyAuth();
  }, [isAuthenticated, authLoading, checkSession, setLocation, toast]);

  // Function to handle form submission
  const onSubmit = async (values: z.infer<typeof binanceApiKeySchema>) => {
    setIsSubmitting(true);
    
    try {
      // This is a placeholder for the API endpoint - we need to create a backend endpoint for Binance API keys
      const response = await apiRequest("POST", "/api/users/binance-api-keys", values);
      
      if (response.ok) {
        setHasSuccessfullySet(true);
        toast({
          title: "API Keys Updated",
          description: "Your Binance API keys have been successfully saved.",
          variant: "default",
        });
      } else {
        const data = await response.json();
        toast({
          title: "Failed to Update API Keys",
          description: data.message || "An error occurred while saving your Binance API keys.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving Binance API keys:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-grow pt-24 pb-12 px-4 md:px-6 ml-0 md:ml-64">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center mb-6">
              <div className="mr-4 p-2 rounded-lg bg-[#F0B90B]/10">
                <SiBinance className="h-8 w-8 text-[#F0B90B]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Binance Integration</h1>
                <p className="text-muted-foreground">Connect your Binance account for real-time trading</p>
              </div>
            </div>

            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">New Feature</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p>Binance integration is now available! Connect your Binance account to trade using our AI-powered system on the world's largest cryptocurrency exchange.</p>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Set Up Binance API Keys</CardTitle>
                  <CardDescription>
                    Enter your Binance API credentials to enable trading functionality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="api-keys" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="api-keys">API Keys</TabsTrigger>
                      <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
                    </TabsList>
                    <TabsContent value="api-keys">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="apiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Key</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your Binance API Key" 
                                    {...field}
                                    type="password"
                                  />
                                </FormControl>
                                <FormDescription>
                                  The API Key provided by Binance
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="secretKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Secret Key</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter your Binance Secret Key" 
                                    {...field}
                                    type="password"
                                  />
                                </FormControl>
                                <FormDescription>
                                  The Secret Key provided by Binance
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="testnet"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 mt-1"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Use Testnet</FormLabel>
                                  <FormDescription>
                                    We highly recommend using Binance Testnet for testing purposes first
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  Save API Keys
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {hasSuccessfullySet && (
                            <Alert className="bg-green-50 border-green-200">
                              <Check className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-800">API Keys Saved</AlertTitle>
                              <AlertDescription className="text-green-700">
                                Your Binance API keys have been successfully saved. You can now use Binance for trading.
                              </AlertDescription>
                            </Alert>
                          )}
                        </form>
                      </Form>
                    </TabsContent>
                    <TabsContent value="instructions">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">How to get your Binance API Keys</h3>
                        <ol className="list-decimal space-y-2 pl-5">
                          <li>Log in to your Binance account</li>
                          <li>Navigate to <strong>API Management</strong> in your account settings</li>
                          <li>Create a new API key and complete any security verification</li>
                          <li>Set the following permissions:
                            <ul className="list-disc pl-5 mt-2">
                              <li>Enable Reading</li>
                              <li>Enable Spot & Margin Trading</li>
                              <li>Disable withdrawals for security</li>
                            </ul>
                          </li>
                          <li>Copy both the API Key and Secret Key</li>
                          <li>Paste them in the fields on the API Keys tab</li>
                        </ol>
                        
                        <Alert className="bg-yellow-50 border-yellow-200 mt-4">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-yellow-800">Important Security Information</AlertTitle>
                          <AlertDescription className="text-yellow-700">
                            <p>Never share your API Secret Key with anyone. Our system securely stores your keys using industry-standard encryption.</p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Benefits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="mr-3 bg-green-100 p-2 rounded-full">
                          <BarChart3 className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Higher Liquidity</h4>
                          <p className="text-xs text-muted-foreground">Access to more trading pairs and deeper order books</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mr-3 bg-blue-100 p-2 rounded-full">
                          <Bot className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">AI Trading</h4>
                          <p className="text-xs text-muted-foreground">Same powerful AI algorithms, now on Binance</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mr-3 bg-purple-100 p-2 rounded-full">
                          <GanttChart className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">More Markets</h4>
                          <p className="text-xs text-muted-foreground">Trade a wider range of cryptocurrencies</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Security</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="mr-3 bg-slate-100 p-2 rounded-full">
                          <Shield className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Encrypted Storage</h4>
                          <p className="text-xs text-muted-foreground">Your API keys are securely encrypted</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="mr-3 bg-slate-100 p-2 rounded-full">
                          <LockKeyhole className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Limited Permissions</h4>
                          <p className="text-xs text-muted-foreground">We recommend disabling withdrawal permissions</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Trading Configuration</CardTitle>
                <CardDescription>Customize your Binance trading settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Configure your Binance trading preferences and risk management settings.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <SlidersHorizontal className="h-4 w-4 mr-2 text-primary" />
                      <h3 className="font-medium">Risk Level</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Set your maximum risk per trade</p>
                    <div className="flex items-center">
                      <Label htmlFor="risk" className="mr-2 text-sm">2% per trade</Label>
                      <Input id="risk" type="range" className="w-full" disabled />
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-4 w-4 mr-2 text-primary" />
                      <h3 className="font-medium">Order Type</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Default order type for trades</p>
                    <div className="flex items-center">
                      <select className="w-full p-2 border rounded-md bg-background" disabled>
                        <option>Market Order</option>
                        <option>Limit Order</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-between">
                <p className="text-sm text-muted-foreground">Settings will be enabled after API key configuration</p>
                <Button disabled>Save Configuration</Button>
              </CardFooter>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}