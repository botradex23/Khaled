import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Features section data
  const features = [
    {
      title: "AI-Powered Trading",
      description:
        "Our advanced AI algorithms analyze market patterns and execute trades at optimal times.",
      icon: <Brain className="h-12 w-12 text-primary" />,
    },
    {
      title: "Real-Time Market Data",
      description:
        "Access up-to-the-second market data from major cryptocurrency exchanges.",
      icon: <TrendingUp className="h-12 w-12 text-primary" />,
    },
    {
      title: "Automated Grid Trading",
      description:
        "Set up grid trading bots that automatically buy low and sell high across a price range.",
      icon: <Bot className="h-12 w-12 text-primary" />,
    },
    {
      title: "Advanced Analytics",
      description:
        "Track your performance with detailed analytics and visual reports.",
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
    },
    {
      title: "Secure by Design",
      description:
        "Your data and API keys are securely encrypted and never shared with third parties.",
      icon: <Shield className="h-12 w-12 text-primary" />,
    },
    {
      title: "Multi-Exchange Support",
      description:
        "Connect with popular cryptocurrency exchanges through secure API integrations.",
      icon: <Globe className="h-12 w-12 text-primary" />,
    },
  ];

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-background border-b border-border/40 fixed z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AreaChart className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CryptoTrade AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Button>
            <Button onClick={() => navigate("/register")}>Sign Up</Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex-1 space-y-6 mb-10 md:mb-0 md:pr-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                AI-Powered Crypto Trading Automation
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
                  Learn More About the System
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 bg-background rounded-lg border border-border/60 shadow-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border/60 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="ml-2 text-sm text-muted-foreground">AI Grid Trading Dashboard</div>
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
              to help you maximize your cryptocurrency trading profits.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 border border-border rounded-lg bg-card transition-all hover:shadow-md hover:border-primary/20"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Learn About System Section */}
      <section className="py-20 px-6 bg-blue-900/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                New to Our Platform? Learn How It Works
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                Before you dive in, explore our comprehensive guide to understand how our
                AI-powered trading system can help you maximize your crypto investments.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/learn")}
                className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                Explore System Features
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
                    Real-time data from multiple exchanges with advanced filters.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Brain className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Smart Strategies</h3>
                  <p className="text-sm text-muted-foreground">
                    Pre-configured trading strategies based on market conditions.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Shield className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">Risk Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Built-in protections with customizable stop-loss settings.
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
            cryptocurrency investments with AI-powered automation.
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
              Sign In
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