import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import Layout from "../components/layout";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Slider } from "../components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define types for risk settings
interface RiskSettings {
  globalStopLoss: number;
  globalTakeProfit: number;
  maxPositionSize: number;
  maxPortfolioRisk: number;
  maxTradesPerDay: number;
  enableGlobalStopLoss: boolean;
  enableGlobalTakeProfit: boolean;
  enableMaxPositionSize: boolean;
  stopLossStrategy: 'fixed' | 'trailing' | 'atr-based';
  enableEmergencyStopLoss: boolean;
  emergencyStopLossThreshold: number;
  defaultStopLossPercent: number;
  defaultTakeProfitPercent: number;
}

// Create Zod schema for form validation
const riskSettingsSchema = z.object({
  globalStopLoss: z.number().min(0.1).max(50),
  globalTakeProfit: z.number().min(0.1).max(100),
  maxPositionSize: z.number().min(1).max(100),
  maxPortfolioRisk: z.number().min(1).max(100),
  maxTradesPerDay: z.number().int().min(1).max(100),
  enableGlobalStopLoss: z.boolean(),
  enableGlobalTakeProfit: z.boolean(),
  enableMaxPositionSize: z.boolean(),
  stopLossStrategy: z.enum(['fixed', 'trailing', 'atr-based']),
  enableEmergencyStopLoss: z.boolean(),
  emergencyStopLossThreshold: z.number().min(5).max(50),
  defaultStopLossPercent: z.number().min(0.5).max(20),
  defaultTakeProfitPercent: z.number().min(0.5).max(50),
});

const defaultRiskSettings: RiskSettings = {
  globalStopLoss: 5,
  globalTakeProfit: 10,
  maxPositionSize: 10,
  maxPortfolioRisk: 20,
  maxTradesPerDay: 10,
  enableGlobalStopLoss: true,
  enableGlobalTakeProfit: true,
  enableMaxPositionSize: true,
  stopLossStrategy: 'fixed',
  enableEmergencyStopLoss: true,
  emergencyStopLossThreshold: 15,
  defaultStopLossPercent: 3,
  defaultTakeProfitPercent: 6,
};

export default function RiskManagementPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user's risk settings
  const { data: riskSettingsData, isLoading } = useQuery<RiskSettings>({
    queryKey: ['/api/v1/user/risk-settings'],
    enabled: isAuthenticated,
  });

  // Set up form with React Hook Form
  const form = useForm<RiskSettings>({
    resolver: zodResolver(riskSettingsSchema),
    defaultValues: defaultRiskSettings,
  });

  // Update form when data is loaded
  useEffect(() => {
    if (riskSettingsData) {
      form.reset(riskSettingsData);
    }
  }, [riskSettingsData, form]);

  // Mutation to save risk settings
  const saveMutation = useMutation({
    mutationFn: async (data: RiskSettings) => {
      setIsSaving(true);
      return await apiRequest('POST', '/api/v1/user/risk-settings', data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your risk management settings have been saved successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user/risk-settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save risk settings:", error);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  // Form submission handler
  const onSubmit = (data: RiskSettings) => {
    saveMutation.mutate(data);
  };

  // Visual risk level calculation
  const calculateRiskLevel = (settings: RiskSettings) => {
    // Simple risk level calculation based on various risk settings
    const stopLossWeight = settings.enableGlobalStopLoss ? settings.globalStopLoss / 10 : 5;
    const positionSizeWeight = settings.enableMaxPositionSize ? settings.maxPositionSize / 20 : 5;
    const portfolioRiskWeight = settings.maxPortfolioRisk / 20;
    
    const riskScore = (stopLossWeight + positionSizeWeight + portfolioRiskWeight) / 3;
    
    if (riskScore < 1.5) return { level: "Very Low", color: "green" };
    if (riskScore < 2.5) return { level: "Low", color: "blue" };
    if (riskScore < 3.5) return { level: "Medium", color: "yellow" };
    if (riskScore < 4.5) return { level: "High", color: "orange" };
    return { level: "Very High", color: "red" };
  };

  // Get current risk level
  const riskLevel = calculateRiskLevel(form.getValues());

  // Calculate recommended values based on experience level
  const getRecommendedSettings = (experienceLevel: 'beginner' | 'intermediate' | 'expert') => {
    switch (experienceLevel) {
      case 'beginner':
        return {
          stopLoss: 3,
          takeProfit: 6,
          maxSize: 5,
          portfolioRisk: 10,
        };
      case 'intermediate':
        return {
          stopLoss: 5,
          takeProfit: 15,
          maxSize: 10,
          portfolioRisk: 20,
        };
      case 'expert':
        return {
          stopLoss: 8,
          takeProfit: 25,
          maxSize: 20,
          portfolioRisk: 30,
        };
    }
  };

  // Apply recommended settings
  const applyRecommendedSettings = (experienceLevel: 'beginner' | 'intermediate' | 'expert') => {
    const settings = getRecommendedSettings(experienceLevel);
    form.setValue('globalStopLoss', settings.stopLoss);
    form.setValue('globalTakeProfit', settings.takeProfit);
    form.setValue('maxPositionSize', settings.maxSize);
    form.setValue('maxPortfolioRisk', settings.portfolioRisk);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
            <p className="text-muted-foreground">
              Configure stop-loss, take-profit, and position sizing settings to protect your portfolio
            </p>
          </div>
          <Badge className={riskLevel.color === "green" ? "bg-green-500" : riskLevel.color === "blue" ? "bg-blue-500" : riskLevel.color === "yellow" ? "bg-yellow-500" : "bg-red-500"}>
            {riskLevel.level} Risk
          </Badge>
        </div>

        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="stop-loss">Stop Loss</TabsTrigger>
            <TabsTrigger value="take-profit">Take Profit</TabsTrigger>
            <TabsTrigger value="position-sizing">Position Sizing</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Risk Management Profile</CardTitle>
                      <CardDescription>
                        Select a preset or customize your own risk settings
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyRecommendedSettings('beginner')}
                        type="button"
                      >
                        Conservative
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyRecommendedSettings('intermediate')}
                        type="button"
                      >
                        Balanced
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => applyRecommendedSettings('expert')}
                        type="button"
                      >
                        Aggressive
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <TabsContent value="general" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>General Risk Settings</CardTitle>
                    <CardDescription>
                      Configure global risk parameters that apply to all trading activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <Alert variant="default" className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">Risk Management</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        Good risk management is the foundation of successful trading. Never risk more than you can afford to lose.
                      </AlertDescription>
                    </Alert>

                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="maxPortfolioRisk"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Portfolio Risk (%)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  value={[field.value]}
                                  min={1}
                                  max={100}
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                                <div className="flex justify-between">
                                  <span className="text-xs text-muted-foreground">1%</span>
                                  <span className="text-xs font-medium">{field.value}%</span>
                                  <span className="text-xs text-muted-foreground">100%</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Maximum percentage of your portfolio that can be at risk at any time
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxTradesPerDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Trades Per Day</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Limit the number of trades that can be executed in a single day
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={form.control}
                      name="enableEmergencyStopLoss"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                              <ShieldAlert className="mr-2 h-4 w-4 text-red-600" />
                              Emergency Stop Loss
                            </FormLabel>
                            <FormDescription>
                              Automatically close all positions if portfolio drawdown exceeds threshold
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("enableEmergencyStopLoss") && (
                      <FormField
                        control={form.control}
                        name="emergencyStopLossThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Stop Loss Threshold (%)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  value={[field.value]}
                                  min={5}
                                  max={50}
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                                <div className="flex justify-between">
                                  <span className="text-xs text-muted-foreground">5%</span>
                                  <span className="text-xs font-medium">{field.value}%</span>
                                  <span className="text-xs text-muted-foreground">50%</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Maximum portfolio drawdown before emergency stop loss is triggered
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stop-loss" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Stop Loss Settings</CardTitle>
                    <CardDescription>
                      Configure when and how to exit losing positions to protect your capital
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="enableGlobalStopLoss"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                              <TrendingDown className="mr-2 h-4 w-4 text-red-600" />
                              Global Stop Loss
                            </FormLabel>
                            <FormDescription>
                              Apply default stop loss settings to all trades
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("enableGlobalStopLoss") && (
                      <>
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="globalStopLoss"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Global Stop Loss (%)</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[field.value]}
                                      min={0.1}
                                      max={50}
                                      step={0.1}
                                      onValueChange={(vals) => field.onChange(vals[0])}
                                    />
                                    <div className="flex justify-between">
                                      <span className="text-xs text-muted-foreground">0.1%</span>
                                      <span className="text-xs font-medium">{field.value}%</span>
                                      <span className="text-xs text-muted-foreground">50%</span>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Default stop loss percentage applied to all trades
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="defaultStopLossPercent"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Stop Loss (%)</FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    <Slider
                                      value={[field.value]}
                                      min={0.5}
                                      max={20}
                                      step={0.1}
                                      onValueChange={(vals) => field.onChange(vals[0])}
                                    />
                                    <div className="flex justify-between">
                                      <span className="text-xs text-muted-foreground">0.5%</span>
                                      <span className="text-xs font-medium">{field.value}%</span>
                                      <span className="text-xs text-muted-foreground">20%</span>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Default stop loss percentage for new trades
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="stopLossStrategy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stop Loss Strategy</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a stop loss strategy" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed Stop Loss</SelectItem>
                                  <SelectItem value="trailing">Trailing Stop Loss</SelectItem>
                                  <SelectItem value="atr-based">ATR-Based Stop Loss</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                {field.value === 'fixed' && "Fixed stop loss at a set percentage below entry price"}
                                {field.value === 'trailing' && "Trailing stop that moves up with price to lock in profits"}
                                {field.value === 'atr-based' && "Dynamic stop loss based on market volatility (ATR)"}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="take-profit" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Take Profit Settings</CardTitle>
                    <CardDescription>
                      Configure when to exit profitable positions to secure gains
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="enableGlobalTakeProfit"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center">
                              <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                              Global Take Profit
                            </FormLabel>
                            <FormDescription>
                              Apply default take profit settings to all trades
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("enableGlobalTakeProfit") && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="globalTakeProfit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Global Take Profit (%)</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Slider
                                    value={[field.value]}
                                    min={0.1}
                                    max={100}
                                    step={0.1}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                  />
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">0.1%</span>
                                    <span className="text-xs font-medium">{field.value}%</span>
                                    <span className="text-xs text-muted-foreground">100%</span>
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Default take profit percentage applied to all trades
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="defaultTakeProfitPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Default Take Profit (%)</FormLabel>
                              <FormControl>
                                <div className="space-y-2">
                                  <Slider
                                    value={[field.value]}
                                    min={0.5}
                                    max={50}
                                    step={0.1}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                  />
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">0.5%</span>
                                    <span className="text-xs font-medium">{field.value}%</span>
                                    <span className="text-xs text-muted-foreground">50%</span>
                                  </div>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Default take profit percentage for new trades
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="position-sizing" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Position Sizing</CardTitle>
                    <CardDescription>
                      Configure how much of your portfolio to risk on each trade
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="enableMaxPositionSize"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Max Position Size</FormLabel>
                            <FormDescription>
                              Limit the maximum size of any single position
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("enableMaxPositionSize") && (
                      <FormField
                        control={form.control}
                        name="maxPositionSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Position Size (% of Portfolio)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Slider
                                  value={[field.value]}
                                  min={1}
                                  max={100}
                                  step={1}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                                <div className="flex justify-between">
                                  <span className="text-xs text-muted-foreground">1%</span>
                                  <span className="text-xs font-medium">{field.value}%</span>
                                  <span className="text-xs text-muted-foreground">100%</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Maximum percentage of your portfolio allocated to any single position
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-800">Position Sizing Recommendation</AlertTitle>
                      <AlertDescription className="text-yellow-700">
                        A common practice is to limit each position to 1-5% of your portfolio. 
                        Only risk money you can afford to lose, and consider your overall risk tolerance.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="mt-6 flex justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save your risk management settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    </Layout>
  );
}