import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { PortfolioProvider } from "./hooks/use-portfolio-value";
import MixpanelProvider from "./components/MixpanelProvider";
import NotFound from "./pages/not-found";
import Home from "./pages/home";
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import DashboardOverview from "./pages/dashboard-overview";
import EnhancedDashboard from "./pages/enhanced-dashboard";
import Bots from "./pages/bots-new";
import BotsDashboard from "./pages/bots-dashboard";
import Markets from "./pages/markets";
import MarketPrices from "./pages/market-prices";
import Register from "./pages/register";
import Login from "./pages/login";
import TestLogin from "./pages/test-login";
import BotDemo from "./pages/bot-demo";
import Learn from "./pages/learn";
import AIGridBot from "./pages/ai-grid-bot";
import DcaBot from "./pages/dca-bot";
import MacdBot from "./pages/macd-bot";
import AITradingPage from "./pages/ai-trading";
import ApiStatus from "./pages/api-status";
import ApiKeys from "./pages/api-keys";
import Account from "./pages/account";
import CompleteProfile from "./pages/complete-profile";
import Binance from "./pages/binance";
import LiveMarket from "./pages/live-market";
import RiskManagement from "./pages/risk-management";
import MLPredictionsPage from "./pages/ml-predictions";
import TradeLogsTestPage from "./pages/trade-logs-test";
import TradeLogsPage from "./pages/trade-logs";
import DirectPricesPage from "./pages/DirectPricesPage";
import AdminMyAgentPage from "./pages/admin-my-agent";
import { DiagnosticPage } from "./pages/DiagnosticPage";
import ChatWithAgentPage from "./pages/ChatWithAgent"; // NEW LINE

function Router() {
  const { isAuthenticated, needsProfileCompletion, isLoading } = useAuth();
  const [, navigate] = useLocation();

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
      <Route path="/dashboard-overview" component={DashboardOverview} />
      <Route path="/enhanced-dashboard" component={EnhancedDashboard} />
      <Route path="/bots" component={BotsDashboard} />
      <Route path="/bots-legacy" component={Bots} />
      <Route path="/markets" component={Markets} />
      <Route path="/market-prices" component={MarketPrices} />
      <Route path="/live-market" component={LiveMarket} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/test-login" component={TestLogin} />
      <Route path="/complete-profile" component={CompleteProfile} />
      <Route path="/bot-demo" component={BotDemo} />
      <Route path="/learn" component={Learn} />
      <Route path="/ml-predictions" component={MLPredictionsPage} />
      <Route path="/ai-grid-bot" component={AIGridBot} />
      <Route path="/dca-bot" component={DcaBot} />
      <Route path="/macd-bot" component={MacdBot} />
      <Route path="/ai-trading" component={AITradingPage} />
      <Route path="/api-status" component={ApiStatus} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/account" component={Account} />
      <Route path="/binance" component={Binance} />
      <Route path="/risk-management" component={RiskManagement} />
      <Route path="/trade-logs-test" component={TradeLogsTestPage} />
      <Route path="/trade-logs" component={TradeLogsPage} />
      <Route path="/direct-prices" component={DirectPricesPage} />
      <Route path="/admin-my-agent" component={AdminMyAgentPage} />
      <Route path="/diagnostics" component={DiagnosticPage} />
      <Route path="/chat-agent" component={ChatWithAgentPage} /> {/* NEW LINE */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MixpanelProvider>
        <AuthProvider>
          <PortfolioProvider>
            <Router />
            <Toaster />
          </PortfolioProvider>
        </AuthProvider>
      </MixpanelProvider>
    </QueryClientProvider>
  );
}

export default App;