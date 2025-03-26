import { useState } from "react";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowUpRight, 
  Wallet, 
  Settings,
  History,
} from "lucide-react";

export default function BotDemo() {
  const [activeTab, setActiveTab] = useState("balance");
  
  // Demo data
  const portfolioValue = 10790.00;
  const cryptocurrencies = [
    { currency: "BTC", value: 5500.00, percentage: 51.0 },
    { currency: "ETH", value: 2200.00, percentage: 20.4 },
    { currency: "USDT", value: 1800.00, percentage: 16.7 },
    { currency: "SOL", value: 1290.00, percentage: 11.9 },
  ];
  
  const trades = [
    { time: "2023-03-26 05:32:10", action: "BUY", pair: "BTC-USDT", amount: "0.02", price: "87742.5" },
    { time: "2023-03-25 18:45:23", action: "SELL", pair: "SOL-USDT", amount: "5.0", price: "144.23" },
    { time: "2023-03-25 12:21:05", action: "BUY", pair: "ETH-USDT", amount: "0.5", price: "2077.11" },
  ];
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow pt-16 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="balance" onValueChange={setActiveTab}>
            <TabsList className="flex w-full space-x-1 mb-6">
              <TabsTrigger value="balance" className="flex-1">
                <Wallet className="h-4 w-4 mr-2" />
                Account Balance
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                <History className="h-4 w-4 mr-2" />
                Trading Activity
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Bot Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="balance" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Portfolio Value</CardTitle>
                  <CardDescription>
                    Managing 4 cryptocurrencies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <span className="text-3xl font-bold">
                        ${portfolioValue.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {cryptocurrencies.map((crypto) => (
                        <div key={crypto.currency} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{crypto.currency}</span>
                            <span>${crypto.value.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={crypto.percentage} className="h-2" />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {crypto.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Live Market Prices</CardTitle>
                  <CardDescription>
                    Key cryptocurrency pairs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="p-4 flex justify-between items-center">
                        <span className="font-medium">BTC-USDT</span>
                        <div className="flex items-center">
                          <span className="text-lg font-semibold mr-2">$87,750.00</span>
                          <Badge variant="default" className="bg-green-500">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            0.45%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-8 px-2 -my-1"
                        onClick={() => window.location.href = "/markets"}
                      >
                        View All Markets
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Recent Bot Activity</CardTitle>
                  <CardDescription>Latest trades executed by your bot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trades.map((trade, index) => (
                      <div key={index} className="border-b last:border-0 pb-3 last:pb-0">
                        <div className="flex justify-between items-center">
                          <div className="font-medium">{trade.pair}</div>
                          <Badge variant={trade.action === "BUY" ? "default" : "destructive"}>
                            {trade.action}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <div>Amount: {trade.amount}</div>
                          <div>Price: ${parseFloat(trade.price).toLocaleString()}</div>
                          <div className="text-xs">{new Date(trade.time).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Bot Configuration</CardTitle>
                  <CardDescription>Adjust your trading parameters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Trading Pair</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>BTC-USDT</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Strategy Type</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>Grid Trading</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Upper Price Bound</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>$95,000</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Lower Price Bound</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>$80,000</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Grid Levels</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>10</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Investment Amount</label>
                        <div className="flex items-center mt-1 p-2 border rounded-md">
                          <span>$10,000</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button disabled className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Changes to bot configuration are disabled in demo mode
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}