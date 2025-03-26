import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Bots from "@/pages/bots";
import Markets from "@/pages/markets";
import Register from "@/pages/register";
import Login from "@/pages/login";
import BotDemo from "@/pages/bot-demo";
import Learn from "@/pages/learn";
import AIGridBot from "@/pages/ai-grid-bot";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bots" component={Bots} />
      <Route path="/markets" component={Markets} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/bot-demo" component={BotDemo} />
      <Route path="/learn" component={Learn} />
      <Route path="/ai-grid-bot" component={AIGridBot} />
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
