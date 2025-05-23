import React, { Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { usePortfolioValue } from "../hooks/use-portfolio-value";
import { cn } from "../lib/utils";
import {
  BarChart,
  BarChart3,
  CandlestickChart,
  Home,
  Key,
  LogOut,
  Settings,
  User,
  FlaskConical,
  Bot,
  LineChart,
  BookOpen,
  Wallet,
  DollarSign,
  ShieldAlert,
  ClipboardList,
  BanknoteIcon, 
  TrendingUpIcon,
  Brain,
  Activity
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

// Import the API Keys Banner
import ApiKeysBanner from "./ui/api-keys-banner";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useIsMobile } from "../hooks/use-mobile";
import { Skeleton } from "./ui/skeleton";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const navigationItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, auth: true },
    { name: "AI Trading", href: "/ai-trading", icon: Bot, auth: true },
    { name: "ML Predictions", href: "/ml-predictions", icon: Brain, auth: true },
    { name: "ML Optimization", href: "/ml-optimization", icon: Activity, auth: true, isNew: true },
    { name: "Binance Markets", href: "/markets", icon: CandlestickChart, auth: true },
    { name: "All Binance Markets", href: "/binance", icon: BarChart, isNew: true },
    { name: "Live Market", href: "/live-market", icon: LineChart },
    { name: "Bots", href: "/bots", icon: FlaskConical, auth: true },
    { name: "Trade Logs", href: "/trade-logs", icon: ClipboardList, auth: true },
    { name: "Risk Management", href: "/risk-management", icon: ShieldAlert, auth: true },
    { name: "API Keys", href: "/api-keys", icon: Key, auth: true },
    { name: "Learn", href: "/learn", icon: BookOpen },
  ];

  const profileItems = [
    { name: "API Keys", href: "/api-keys", icon: Key },
    { name: "API Status", href: "/api-status", icon: LineChart },
    { name: "ML Optimization", href: "/ml-optimization", icon: Activity, isNew: true },
    { name: "Trade Logs", href: "/trade-logs", icon: ClipboardList },
    { name: "Risk Management", href: "/risk-management", icon: ShieldAlert },
  ];

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  const isActive = (href: string) => {
    return location === href;
  };

  // Get portfolio value from context
  const { totalValue, isLoading: isPortfolioLoading } = usePortfolioValue();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Portfolio Value Banner - only visible when authenticated and on larger screens */}
      {isAuthenticated && (
        <div className="bg-primary text-white py-2 hidden md:block">
          <div className="container flex justify-between items-center">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium mr-1">Total Portfolio Value:</span>
              {isPortfolioLoading ? (
                <Skeleton className="h-5 w-20 bg-primary-foreground/30" />
              ) : (
                <span className="text-sm font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              )}
            </div>
            <Link href="/account">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20">
                <Wallet className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center font-bold text-2xl mr-6">
              <CandlestickChart className="h-6 w-6 mr-2 text-secondary" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary font-heading font-bold">Tradeliy</span>
            </Link>
            
            {!isMobile && (
              <nav className="hidden md:flex items-center space-x-1">
                {navigationItems.map((item) => {
                  if (item.auth && !isAuthenticated) return null;
                  return (
                    <Link key={item.name} href={item.href}>
                      <Button
                        variant={isActive(item.href) ? "secondary" : "ghost"}
                        className="flex items-center justify-center"
                        size="sm"
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                        {item.isNew && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md">
                            New
                          </span>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center">
            {/* API Keys special button - visible for authenticated users that need to set up keys */}
            {isAuthenticated && (
              <Link href="/api-keys" className="mr-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-primary/10 border-primary text-primary hover:bg-primary/20 hidden md:flex"
                >
                  <Key className="h-4 w-4 mr-1" />
                  Setup API Keys
                </Button>
              </Link>
            )}
            
            {/* Portfolio Value Display for mobile */}
            {isAuthenticated && isMobile && (
              <div className="mr-3 flex items-center">
                <Wallet className="h-4 w-4 text-primary mr-1" />
                {isPortfolioLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="text-xs font-semibold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                )}
              </div>
            )}
            
            {/* Theme Toggle */}
            <div className="mr-2">
              <ThemeToggle />
            </div>
            
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src="/avatar.png" alt={user?.firstName || "User"} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {profileItems.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <DropdownMenuItem className="cursor-pointer">
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                        {item.isNew && (
                          <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md">
                            New
                          </span>
                        )}
                      </DropdownMenuItem>
                    </Link>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t py-2">
          <div className="container grid grid-cols-5 gap-1">
            {/* First item is always Home, second is API Keys, followed by the rest in order */}
            {[
              navigationItems[0], // Home
              navigationItems.find(item => item.name === "API Keys"), // API Keys
              ...navigationItems.filter(item => item.name !== "Home" && item.name !== "API Keys").slice(0, 3) // The next three items
            ].map((item) => {
              if (!item || (item.auth && !isAuthenticated)) return null;
              return (
                <Link key={item.name} href={item.href} className="flex flex-col items-center">
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className={cn(
                      "h-auto w-full flex flex-col items-center justify-center py-1 px-0",
                      isActive(item.href) ? "bg-muted" : ""
                    )}
                    size="sm"
                  >
                    <item.icon className="h-5 w-5" />
                    <div className="flex items-center">
                      <span className="text-xs mt-1">{item.name}</span>
                      {item.isNew && (
                        <span className="ml-1 text-[0.6rem] bg-primary text-primary-foreground px-1 py-0 rounded-md">
                          New
                        </span>
                      )}
                    </div>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {/* Display warning banner for users without API keys */}
        <div className="container mt-4">
          <ApiKeysBanner />
        </div>
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 bg-muted/50">
        <div className="container flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0 flex items-center">
            <CandlestickChart className="h-4 w-4 mr-2 text-secondary" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} <span className="font-medium text-primary">Tradeliy</span>. All rights reserved.
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <ThemeToggle />
            <div className="flex space-x-4">
              <Link href="/terms">
                <span className="text-sm text-muted-foreground hover:text-foreground">
                  Terms
                </span>
              </Link>
              <Link href="/privacy">
                <span className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy
                </span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}