import { Button } from "@/components/ui/button";
import { heroChartData } from "@/lib/chart-data";
import { Link } from "wouter";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";

export default function Hero() {
  return (
    <section className="px-6 py-12 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="order-2 md:order-1">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Automated Trading
            </span>{" "}
            for Everyone
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Professional-grade automated crypto trading strategies with no coding required. 
            Start building your portfolio in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
            <Link href="/bot-demo">
              <Button 
                size="lg" 
                variant="outline" 
                className="border-muted hover:border-primary"
              >
                View Demo
              </Button>
            </Link>
          </div>
          
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">$2.4B+</p>
              <p className="text-sm text-muted-foreground">Trading Volume</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">100K+</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-sm text-muted-foreground">Market Coverage</p>
            </div>
          </div>
        </div>
        
        <div className="order-1 md:order-2 relative">
          <div className="relative z-10 gradient-border p-1 rounded-2xl">
            <div className="bg-card rounded-xl overflow-hidden p-4">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={heroChartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem' 
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary rounded-full opacity-10 blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-secondary rounded-full opacity-10 blur-3xl"></div>
        </div>
      </div>
    </section>
  );
}
