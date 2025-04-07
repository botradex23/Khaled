import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Bell,
  Menu,
  User,
  Settings,
  ChevronDown,
  LogOut,
  Lock,
  ArrowUpRight,
  LineChart,
  Globe,
  Bot,
  DollarSign,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { useAuth } from "../../hooks/use-auth";
import { motion } from 'framer-motion';

const generateLogoSVG = () => {
  // Premium logo with trading/crypto theme
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="url(#paint0_linear)" />
      <path d="M20 8L28 16H24V24H16V16H12L20 8Z" fill="white" />
      <path d="M20 32L12 24H16V16H24V24H28L20 32Z" fill="white" opacity="0.8" />
      <defs>
        <linearGradient id="paint0_linear" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3B82F6" />
          <stop offset="1" stop-color="#1E40AF" />
        </linearGradient>
      </defs>
    </svg>
  `;
};

// Define navigation items
const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: <LineChart className="w-4 h-4 mr-2" /> },
  { href: '/markets', label: 'Markets', icon: <Globe className="w-4 h-4 mr-2" /> },
  { href: '/bots', label: 'Trading Bots', icon: <Bot className="w-4 h-4 mr-2" /> },
  { href: '/portfolio', label: 'Portfolio', icon: <DollarSign className="w-4 h-4 mr-2" /> },
  { href: '/learn', label: 'Learn', icon: <BookOpen className="w-4 h-4 mr-2" /> },
];

export function PremiumHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/95 backdrop-blur-sm border-b shadow-sm' 
          : 'bg-background'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and brand */}
          <div className="flex items-center gap-2">
            <Link href="/">
              <a className="flex items-center space-x-2">
                <div className="relative w-10 h-10" dangerouslySetInnerHTML={{ __html: generateLogoSVG() }} />
                <span className="font-bold text-xl tracking-tight text-foreground">CryptoTrade</span>
              </a>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {mainNavItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                    isActive 
                      ? 'text-foreground bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}>
                    {item.icon}
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* User area */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            {/* User menu for desktop */}
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={undefined} alt={user.username || 'User'} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {(user.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden lg:inline-block">
                      {user.username || 'User'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <a className="flex items-center cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <a className="flex items-center cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/security">
                      <a className="flex items-center cursor-pointer">
                        <Lock className="mr-2 h-4 w-4" />
                        Security
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !isLoading ? (
              <div className="flex items-center space-x-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">
                    <a>Log in</a>
                  </Link>
                </Button>
                <Button asChild variant="default" size="sm">
                  <Link href="/register">
                    <a className="flex items-center">
                      Register
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </a>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            )}

            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 sm:w-80">
                <nav className="flex flex-col gap-4 mt-8">
                  {mainNavItems.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <a className={`flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive 
                            ? 'text-foreground bg-primary/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}>
                          {item.icon}
                          {item.label}
                        </a>
                      </Link>
                    );
                  })}
                  <div className="h-px bg-border my-4" />
                  <a href="https://support.cryptotrade.com" 
                     className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground hover:text-foreground">
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Support
                  </a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}