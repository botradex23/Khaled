import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Input 
} from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { 
  Menu, 
  X, 
  User, 
  Gauge, 
  BarChart3, 
  BookOpen, 
  Grid, 
  Activity, 
  LayoutGrid, 
  Settings,
  ExternalLink,
  KeyRound,
  Save,
  Loader2,
  Check,
  BrainCircuit
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  const [location] = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [showBinanceDialog, setShowBinanceDialog] = useState(false);
  const [binanceApiKey, setBinanceApiKey] = useState("");
  const [binanceSecretKey, setBinanceSecretKey] = useState("");
  const [binanceAllowedIp, setBinanceAllowedIp] = useState("185.199.228.220");
  const [useTestnet, setUseTestnet] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasBinanceKeys, setHasBinanceKeys] = useState(false);

  // Query to check if the user has Binance API keys configured
  const { data: binanceApiKeysData, isLoading: binanceApiKeysLoading, refetch: refetchBinanceApiKeys } = useQuery({
    queryKey: ['/api/binance/api-keys'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const response = await fetch('/api/binance/api-keys');
      if (!response.ok) throw new Error('Failed to fetch Binance API keys status');
      return response.json();
    },
    enabled: isAuthenticated,
    retry: 0,
    refetchOnWindowFocus: false
  });

  // Update state when data is loaded
  useEffect(() => {
    if (binanceApiKeysData && !binanceApiKeysLoading) {
      setHasBinanceKeys(binanceApiKeysData.hasBinanceApiKey && binanceApiKeysData.hasBinanceSecretKey);
    }
  }, [binanceApiKeysData, binanceApiKeysLoading]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  // Function to save Binance API keys
  const saveBinanceApiKeys = async () => {
    // Validate inputs
    if (!binanceApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive"
      });
      return;
    }

    if (!binanceSecretKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Secret key",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Call the API endpoint to save the Binance API keys
      const response = await fetch("/api/binance/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: binanceApiKey,
          secretKey: binanceSecretKey,
          allowedIp: binanceAllowedIp,
          testnet: useTestnet
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Excellent!",
          description: "Binance API keys saved successfully",
          variant: "default"
        });
        
        // Close the dialog and reset fields
        setShowBinanceDialog(false);
        setBinanceApiKey("");
        setBinanceSecretKey("");
        // Leave IP address as is because it's likely to remain the same
        
        // Refresh the API keys data to update the UI
        refetchBinanceApiKeys();
      } else {
        toast({
          title: "Error Saving Keys",
          description: data.message || "An unexpected error occurred",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving Binance API keys:", error);
      toast({
        title: "Error Saving Keys",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4 mr-2" /> },
    { to: "/markets", label: "Markets", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
    { to: "/bots", label: "Bots", icon: <Grid className="h-4 w-4 mr-2" /> },
    { to: "/ml-predictions", label: "ML Predictions", icon: <BrainCircuit className="h-4 w-4 mr-2" /> },
    { to: "/learn", label: "Learn", icon: <BookOpen className="h-4 w-4 mr-2" /> },
    { to: "/api-status", label: "API Status", icon: <Activity className="h-4 w-4 mr-2" /> },
    { to: "/binance", label: "Binance", icon: <ExternalLink className="h-4 w-4 mr-2" /> },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary text-xl font-bold cursor-pointer">
                Cryptex
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          {!isMobile && (
            <nav className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link key={link.to} href={link.to}>
                  <span
                    className={`flex items-center text-sm font-medium ${
                      location === link.to
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-primary transition-colors"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Binance Button with badge showing status */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`flex items-center mr-2 font-medium ${
                    hasBinanceKeys 
                      ? "border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" 
                      : "border-yellow-500 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                  }`}
                  onClick={() => {
                    // Open Binance API modal
                    setShowBinanceDialog(true);
                  }}
                >
                  <img 
                    src="https://bin.bnbstatic.com/static/images/common/favicon.ico" 
                    alt="Binance Logo" 
                    className="w-4 h-4 mr-1.5"
                  />
                  Binance
                  {hasBinanceKeys ? (
                    <Check className="ml-1 h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Badge variant="outline" className="ml-1.5 py-0 h-4 text-[10px] font-bold px-1.5 bg-yellow-100 text-yellow-800 border-yellow-400">
                      NEW
                    </Badge>
                  )}
                </Button>
                
                {!isMobile && (
                  <div className="text-sm text-muted-foreground flex items-center">
                    <span className="mr-2">Welcome,</span>
                    <span className="font-medium text-foreground">
                      {user?.firstName || 'User'}
                    </span>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user && (
                      <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                        {user.email}
                      </div>
                    )}
                    <DropdownMenuItem>
                      <Link href="/dashboard">
                        <span className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          Dashboard
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/settings">
                        <span className="flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={toggleMenu}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && isOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              {/* Binance option for mobile with status indicator */}
              {isAuthenticated && (
                <div 
                  className={`flex items-center cursor-pointer text-sm font-medium px-2.5 py-1.5 rounded ${
                    hasBinanceKeys 
                      ? "text-green-600 hover:text-green-700 bg-green-50" 
                      : "text-yellow-600 hover:text-yellow-700 bg-yellow-50"
                  }`}
                  onClick={() => {
                    closeMenu();
                    setShowBinanceDialog(true);
                  }}
                >
                  <img 
                    src="https://bin.bnbstatic.com/static/images/common/favicon.ico" 
                    alt="Binance Logo" 
                    className="w-4 h-4 mr-2"
                  />
                  Binance
                  {hasBinanceKeys ? (
                    <Check className="ml-1 h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Badge variant="outline" className="ml-1.5 py-0 h-4 text-[10px] font-bold px-1.5 bg-yellow-100 text-yellow-800 border-yellow-400">
                      NEW
                    </Badge>
                  )}
                </div>
              )}
              
              {navLinks.map((link) => (
                <Link key={link.to} href={link.to} onClick={closeMenu}>
                  <span
                    className={`flex items-center text-sm font-medium ${
                      location === link.to
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary transition-colors"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
      
      {/* Binance API Modal */}
      <Dialog open={showBinanceDialog} onOpenChange={setShowBinanceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <img 
                src="https://bin.bnbstatic.com/static/images/common/favicon.ico" 
                alt="Binance Logo" 
                className="w-5 h-5 mr-2"
              />
              Configure Binance API Keys
            </DialogTitle>
            <DialogDescription>
              {hasBinanceKeys ? (
                <div className="flex items-center text-green-600 mt-1">
                  <Check className="h-4 w-4 mr-1.5" />
                  <span>Binance API keys are already configured. You can update them here.</span>
                </div>
              ) : (
                <span>Enter your Binance API keys to start receiving and analyzing your Binance account data.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-api-key" className="text-right">
                API Key
              </Label>
              <Input
                id="binance-api-key"
                value={binanceApiKey}
                onChange={(e) => setBinanceApiKey(e.target.value)}
                className="col-span-3"
                placeholder="Enter your Binance API key"
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-secret-key" className="text-right">
                Secret Key
              </Label>
              <Input
                id="binance-secret-key"
                value={binanceSecretKey}
                onChange={(e) => setBinanceSecretKey(e.target.value)}
                className="col-span-3"
                type="password"
                placeholder="Enter your Binance Secret key"
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="binance-allowed-ip" className="text-right">
                Allowed IP Address
              </Label>
              <Input
                id="binance-allowed-ip"
                value={binanceAllowedIp}
                onChange={(e) => setBinanceAllowedIp(e.target.value)}
                className="col-span-3"
                placeholder="IP address you configured in Binance"
                autoComplete="off"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="useTestnet" className="text-right">
                Test Environment
              </Label>
              <div className="flex items-center col-span-3">
                <Switch
                  id="useTestnet"
                  checked={useTestnet}
                  onCheckedChange={setUseTestnet}
                />
                <Label htmlFor="useTestnet" className="ml-2">
                  {useTestnet ? 'Using test environment' : 'Using production environment (real)'}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBinanceDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={saveBinanceApiKeys}
              disabled={isSaving}
              className={`${
                hasBinanceKeys 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-yellow-500 hover:bg-yellow-600"
              } text-white`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Keys
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}