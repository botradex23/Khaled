import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidedTour, useGuidedTour } from "@/components/ui/guided-tour";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeatureTooltip, PopoverHelpButton } from "@/components/ui/feature-tooltip";
import { cn } from "@/lib/utils";
import { PremiumHeader } from "@/components/ui/premium-header";
import {
  Brain,
  TrendingUp,
  Bot,
  BarChart3,
  Shield,
  Globe,
  ChevronRight,
  Lock,
  AreaChart,
  LineChart,
  Github,
  PlayCircle,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  BadgeCheck,
  HandCoins,
  ArrowUpRight,
  MousePointerClick,
  Info,
} from "lucide-react";
import { SiBinance } from "react-icons/si";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { showTour, setShowTour } = useGuidedTour();
  const [activeTab, setActiveTab] = useState("what-is");

  // Features section data
  const features = [
    {
      title: "AI-Powered Trading",
      description:
        "Advanced algorithms analyze market patterns and execute trades at optimal times.",
      icon: <Brain className="h-12 w-12 text-primary" />,
      tooltip: "Our system uses machine learning models trained on millions of historical transactions"
    },
    {
      title: "Real-Time Market Data",
      description:
        "Access up-to-date information from leading crypto exchanges with instant updates.",
      icon: <TrendingUp className="h-12 w-12 text-primary" />,
      tooltip: "Receives data from multiple sources including Binance and OKX with millisecond response time"
    },
    {
      title: "Automated Grid Trading",
      description:
        "Set up bots to buy low and sell high across a range of price points.",
      icon: <Bot className="h-12 w-12 text-primary" />,
      tooltip: "A popular trading technique that works well in volatile markets. The system creates an automatic grid of buys and sells"
    },
    {
      title: "Advanced Analytics",
      description:
        "Track your performance with detailed analysis and visual reports.",
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
      tooltip: "Displays detailed reports including ROI, risk-adjusted returns, performance over time, and more"
    },
    {
      title: "Built-in Security",
      description:
        "Your API keys and data are encrypted and never shared with third parties.",
      icon: <Shield className="h-12 w-12 text-primary" />,
      tooltip: "We use military-grade encryption and advanced security protocols to protect your information"
    },
    {
      title: "Multi-Exchange Support",
      description:
        "Connect to popular crypto exchanges through secure API integrations.",
      icon: <Globe className="h-12 w-12 text-primary" />,
      tooltip: "The system supports Binance, OKX and will soon support additional exchanges"
    },
  ];

  // Define bot types for the "Bot Types" tab
  const botTypes = [
    {
      name: "AI Grid Bot",
      description: "Creates a network of buy and sell orders across a price range and automatically adjusts the grid based on changing market conditions.",
      icon: <Bot className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "Works well in volatile markets",
        "Buys low, sells high automatically",
        "Performs well in sideways markets"
      ],
      path: "/ai-grid-bot"
    },
    {
      name: "DCA Bot",
      description: "Dollar Cost Averaging bot purchases predefined amounts of cryptocurrency at fixed intervals, regardless of the current market price.",
      icon: <HandCoins className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "Reduces average purchase cost over time",
        "Minimizes impact of volatility long-term",
        "Simple yet effective long-term strategy"
      ],
      path: "/dca-bot"
    },
    {
      name: "MACD Bot",
      description: "Based on the Moving Average Convergence Divergence indicator to identify trend changes and momentum in market prices.",
      icon: <LineChart className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "Identifies trends and reversal signals",
        "Seeks optimal entry and exit points",
        "Proven technical strategy for all markets"
      ],
      path: "/macd-bot"
    }
  ];

  // Quick tips for new users
  const quickTips = [
    {
      title: "Start with Paper Trading",
      description: "Try different strategies without financial risk in our virtual trading environment.",
      icon: <MousePointerClick className="h-5 w-5 text-primary" />,
    },
    {
      title: "Set Risk Boundaries",
      description: "Always use risk management settings like Stop Loss to limit potential losses.",
      icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
    },
    {
      title: "Check the Guides",
      description: "Click on help icons and review various guides to understand all system features.",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    },
  ];

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Guided Tour Dialog */}
      <GuidedTour open={showTour} onOpenChange={setShowTour} />
      
      {/* Use Premium Header instead of custom header */}
      <PremiumHeader />

      {/* Hero section */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex-1 space-y-6 mb-10 md:mb-0 md:pr-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                AI-Powered Crypto Trading
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Harness the power of artificial intelligence to trade cryptocurrencies with precision and efficiency.
                Our platform brings institutional-grade algorithms to retail traders.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="text-lg h-12"
                >
                  Get Started <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/learn")}
                  className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 bg-background rounded-lg border border-border/60 shadow-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border/60 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="ml-2 text-sm text-muted-foreground">AI Grid Bot Dashboard</div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">BTC/USDT</div>
                      <div className="text-sm text-green-500">+2.34%</div>
                    </div>
                    <div className="h-48 w-full bg-muted/20 rounded-md overflow-hidden relative">
                      {/* Simulated chart */}
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0,50 Q10,45 20,55 T40,45 T60,50 T80,35 T100,40"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                        />
                        <path
                          d="M0,50 Q10,45 20,55 T40,45 T60,50 T80,35 T100,40 V100 H0 Z"
                          fill="hsl(var(--primary)/0.1)"
                          stroke="none"
                        />
                      </svg>
                      {/* Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="border-border/10 border-r last:border-r-0 border-b last:border-b-0"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground">Total Profit</div>
                        <div className="text-lg font-semibold text-green-500">$1,245.32</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground">Active Bots</div>
                        <div className="text-lg font-semibold">3</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-4 -bottom-4 w-48 h-48 bg-primary/20 rounded-full filter blur-3xl -z-10" />
              <div className="absolute -right-8 -top-8 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Powerful Features for Crypto Traders
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines advanced AI technology with user-friendly tools
              to help you maximize your crypto trading profits.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureTooltip
                key={index}
                title={feature.title}
                description={feature.tooltip}
                position="top"
                icon={<Info className="h-3.5 w-3.5" />}
              >
                <div
                  className="p-6 border border-border rounded-lg bg-card transition-all hover:shadow-md hover:border-primary/20 cursor-help"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </FeatureTooltip>
            ))}
          </div>
        </div>
      </section>
      
      {/* Information Tabs Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything You Need to Know
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Important information for both new and experienced users
            </p>
          </div>
          
          <Tabs defaultValue="what-is" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="grid grid-cols-3 w-full max-w-xl">
                <TabsTrigger value="what-is" className="text-sm">What Is It?</TabsTrigger>
                <TabsTrigger value="bot-types" className="text-sm">Bot Types</TabsTrigger>
                <TabsTrigger value="quick-tips" className="text-sm">Quick Tips</TabsTrigger>
              </TabsList>
            </div>
            
            <Card className="border-border/60">
              <TabsContent value="what-is" className="m-0">
                <CardHeader>
                  <CardTitle>How the System Works</CardTitle>
                  <CardDescription>
                    A brief explanation of the technology and benefits behind the system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2 space-y-4">
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Brain className="w-5 h-5 mr-2 text-primary" />
                          AI in Trading
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          The system analyzes tens of thousands of data points at any given moment, including historical prices,
                          trading volumes, market sentiment, and technical indicators to identify patterns and predict price movements.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>76% accuracy in identifying significant trends</span>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Shield className="w-5 h-5 mr-2 text-primary" />
                          Smart Risk Management
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Bots include built-in protection mechanisms such as automatic Stop Loss settings,
                          investment diversification, and customized risk limits for each strategy.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>35% reduction in portfolio volatility</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:w-1/2 space-y-4">
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <SiBinance className="w-5 h-5 mr-2 text-primary" />
                          Exchange Connectivity
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          The system connects directly to your exchange account (via API) and executes trades automatically.
                          The keys are stored securely and are never exposed.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>Support for leading exchanges</span>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Bot className="w-5 h-5 mr-2 text-primary" />
                          Autonomous Bots
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          The bots operate 24/7 without the need for human intervention. They scan the market,
                          identify opportunities, and take actions according to predefined strategies.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>Working non-stop even while you sleep</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button onClick={() => setActiveTab("bot-types")} className="flex items-center">
                      Available Bot Types
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="bot-types" className="m-0">
                <CardHeader>
                  <CardTitle>Bot Types in the System</CardTitle>
                  <CardDescription>
                    Get to know the different bots and their trading strategies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {botTypes.map((bot, index) => (
                      <Card key={index} className="bg-card/70 border-border/70">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            {bot.icon}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary h-6 px-2 py-1"
                              onClick={() => navigate(bot.path)}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <CardTitle className="text-lg">{bot.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-4">
                            {bot.description}
                          </p>
                          <div className="space-y-2">
                            {bot.benefits.map((benefit, i) => (
                              <div key={i} className="flex items-center text-xs">
                                <BadgeCheck className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button onClick={() => setActiveTab("quick-tips")} className="flex items-center">
                      Quick Tips
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="quick-tips" className="m-0">
                <CardHeader>
                  <CardTitle>Quick Start Tips</CardTitle>
                  <CardDescription>
                    Useful advice for new users of the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                    {quickTips.map((tip, index) => (
                      <div 
                        key={index} 
                        className="flex p-4 bg-muted/40 rounded-lg border border-border/60"
                      >
                        <div className="mr-4 mt-1">
                          <div className="p-2 bg-background rounded-full">
                            {tip.icon}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">{tip.title}</h3>
                          <p className="text-sm text-muted-foreground">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 flex items-center">
                      <Info className="h-5 w-5 text-primary mr-4" />
                      <div>
                        <p className="text-sm">
                          For more detailed explanations, <Link href="/learn" className="text-primary font-medium underline underline-offset-4">visit our guides page</Link> or start a <Button variant="link" className="h-auto p-0 text-primary underline underline-offset-4" onClick={() => setShowTour(true)}>guided tour</Button>.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-8">
                    <Button onClick={() => setActiveTab("what-is")} className="flex items-center">
                      Back to System Explanation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </section>

      {/* Learn About System Section */}
      <section className="py-20 px-6 bg-blue-900/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                New to the System? Learn How It Works
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Before diving in, explore our comprehensive guide to understand how our trading system
                can help maximize your cryptocurrency investments.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/learn")}
                className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                Discover System Features
              </Button>
            </div>
            <div className="md:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Bot className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">AI Grid Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    Automated trading across price ranges optimized by artificial intelligence.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <TrendingUp className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Market Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time data from multiple exchanges with advanced filtering capabilities.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Brain className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Smart Strategies</h3>
                  <p className="text-sm text-muted-foreground">
                    Predefined trading strategies based on market conditions.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Shield className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Risk Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Built-in protections with customizable stop loss settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to Automate Your Crypto Trading?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of traders using our platform to optimize their
            cryptocurrency investments through AI-powered automation.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              className="text-lg h-12"
            >
              Create Free Account
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
              className="text-lg h-12"
            >
              Login
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowTour(true)}
              className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            >
              Start Guided Tour
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-muted/40 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <AreaChart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">CryptoTrade AI</span>
              </div>
              <p className="text-muted-foreground max-w-md mb-6">
                Our mission is to democratize access to sophisticated trading
                algorithms and make AI-powered trading accessible to everyone.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.01 10.01 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">GitHub</span>
                  <Github className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Platform</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={() => navigate("/learn")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Learn
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    API Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} CryptoTrade AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}