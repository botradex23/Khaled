import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../hooks/use-auth";
import { AITradingSignals } from "../components/ui/ai-trading-signals";
import { BrainCircuit, AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";

// Simple hook to check if user has Binance API keys
function useBinanceApiKeyStatus() {
  const { user } = useAuth();
  const [state, setState] = useState({
    hasBinanceKeys: false,
    isLoading: true
  });

  useEffect(() => {
    // When we have the user, we can check if they have keys
    if (user) {
      const hasKeys = Boolean(user.binanceApiKey && user.binanceSecretKey);
      setState({
        hasBinanceKeys: hasKeys,
        isLoading: false
      });
    } else if (user === null) {
      // User is definitely not logged in
      setState({
        hasBinanceKeys: false,
        isLoading: false
      });
    }
  }, [user]);

  return state;
}

// Simple API key dialog component
function BinanceApiKeyDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [location, navigate] = useLocation();
  
  // Just redirect to the API keys page for now
  useEffect(() => {
    if (open) {
      navigate("/api-keys");
      onOpenChange(false);
    }
  }, [open, navigate, onOpenChange]);
  
  return null;
}

export default function AITradingPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { hasBinanceKeys, isLoading } = useBinanceApiKeyStatus();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  
  // If not authenticated, redirect to auth page
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  // Auto-open API key dialog if user doesn't have keys
  useEffect(() => {
    if (!isLoading && !hasBinanceKeys) {
      setIsApiKeyDialogOpen(true);
    }
  }, [hasBinanceKeys, isLoading]);

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <>
      <div className="py-6 px-4 md:px-8 lg:px-12 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BrainCircuit className="h-8 w-8" />
              AI Trading
            </h1>
            <p className="text-muted-foreground">
              Advanced AI-powered trading signals and automated execution
            </p>
          </div>
          
          {!hasBinanceKeys && (
            <Button 
              variant="outline" 
              onClick={() => setIsApiKeyDialogOpen(true)}
            >
              Configure Binance API Keys
            </Button>
          )}
        </div>
        
        {!hasBinanceKeys ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Binance API Keys Required</AlertTitle>
            <AlertDescription>
              To access AI trading features, you need to configure your Binance API keys.
              Click the button above to set up your keys.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <Info className="h-4 w-4" />
              <AlertTitle>AI Trading System</AlertTitle>
              <AlertDescription>
                The AI analyzes market data to generate trading signals with buy/sell recommendations.
                All trades are executed in testnet mode for safety. Always review signals before executing trades.
              </AlertDescription>
            </Alert>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>Understanding the AI trading system</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Data Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI model analyzes historical and real-time market data, including 
                      price trends, volume, and technical indicators.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Signal Generation</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on the analysis, the AI generates trading signals with 
                      buy, sell, or hold recommendations for various cryptocurrencies.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-2">Automated Execution</h3>
                    <p className="text-sm text-muted-foreground">
                      You can execute trades manually based on signals or enable automated 
                      trading that follows the AI recommendations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <AITradingSignals />
          </>
        )}
      </div>
      
      <BinanceApiKeyDialog 
        open={isApiKeyDialogOpen} 
        onOpenChange={setIsApiKeyDialogOpen} 
      />
    </>
  );
}