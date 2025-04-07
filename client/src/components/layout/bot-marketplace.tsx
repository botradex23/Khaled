import React from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { LineChart, ArrowUpRight, Waves, TrendingUp, Plus, RefreshCw } from "lucide-react";

export function BotMarketplace() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Grid Strategy */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Grid Trading</CardTitle>
            <LineChart className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>
            Automated buy low, sell high strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
              <span className="text-sm font-medium">+5.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-4 mx-0.5 rounded-sm ${i < 2 ? 'bg-primary' : 'bg-border'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/grid-bot" className="w-full">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Deploy Grid Bot
            </Button>
          </Link>
        </CardFooter>
      </Card>
      
      {/* DCA Strategy */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">DCA Bot</CardTitle>
            <ArrowUpRight className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>
            Dollar Cost Averaging investment strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
              <span className="text-sm font-medium">+3.8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-4 mx-0.5 rounded-sm ${i < 1 ? 'bg-primary' : 'bg-border'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/dca-bot" className="w-full">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Deploy DCA Bot
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* MACD Strategy */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">MACD Strategy</CardTitle>
            <Waves className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>
            Technical indicator based trading strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
              <span className="text-sm font-medium">+6.5%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-4 mx-0.5 rounded-sm ${i < 3 ? 'bg-primary' : 'bg-border'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/macd-bot" className="w-full">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Deploy MACD Bot
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* AI Grid Strategy */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">AI Grid Trading</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>
            ML-optimized grid parameters for maximum return
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Avg. Monthly Return</span>
              <span className="text-sm font-medium">+7.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-4 mx-0.5 rounded-sm ${i < 3 ? 'bg-primary' : 'bg-border'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/ai-grid-bot" className="w-full">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Deploy AI Grid Bot
            </Button>
          </Link>
        </CardFooter>
      </Card>
      
      {/* Paper Trading */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Paper Trading</CardTitle>
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <CardDescription>
            Risk-free simulated trading environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Initial Balance</span>
              <span className="text-sm font-medium">$10,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Risk Level</span>
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 h-4 mx-0.5 rounded-sm ${i < 0 ? 'bg-primary' : 'bg-border'}`} 
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href="/binance" className="w-full">
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Start Paper Trading
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}