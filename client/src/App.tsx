import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Bots from "@/pages/bots";
import Markets from "@/pages/markets";
import MarketPrices from "@/pages/market-prices";
import Register from "@/pages/register";
import Login from "@/pages/login";
import TestLogin from "@/pages/test-login";
import BotDemo from "@/pages/bot-demo";
import Learn from "@/pages/learn";
import AIGridBot from "@/pages/ai-grid-bot";
import ApiStatus from "@/pages/api-status";
import ApiKeys from "@/pages/api-keys";
import Account from "@/pages/account";
import CompleteProfile from "@/pages/complete-profile";

function Router() {
  const { isAuthenticated, needsProfileCompletion, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Check if authenticated user needs to complete profile
  React.useEffect(() => {
    if (isAuthenticated && needsProfileCompletion && !isLoading) {
      navigate('/complete-profile');
    }
  }, [isAuthenticated, needsProfileCompletion, isLoading, navigate]);
  
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bots" component={Bots} />
      <Route path="/markets" component={Markets} />
      <Route path="/market-prices" component={MarketPrices} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/test-login" component={TestLogin} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/bot-demo" component={BotDemo} />
      <Route path="/learn" component={Learn} />
      <Route path="/ai-grid-bot" component={AIGridBot} />
      <Route path="/api-status" component={ApiStatus} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/account" component={Account} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
