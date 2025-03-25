import { gridChartData, dcaChartData, macdChartData } from "@/lib/chart-data";
import StrategyCard from "@/components/ui/strategy-card";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function BotStrategies() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Popular Bot Strategies</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose from our marketplace of pre-built strategies or customize your own.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <StrategyCard
            title="Grid Trading"
            badgeText="Popular"
            badgeVariant="blue"
            monthlyReturn="+15.4%"
            description="Buy low and sell high by creating a grid of orders above and below the current price."
            chartData={gridChartData}
            minInvestment="$100"
            riskLevel={2}
            ratingScore="4.8/5"
          />
          
          <StrategyCard
            title="DCA Strategy"
            badgeText="For Beginners"
            badgeVariant="green"
            monthlyReturn="+8.2%"
            description="Dollar-cost averaging that automatically buys at regular intervals regardless of price."
            chartData={dcaChartData}
            minInvestment="$50"
            riskLevel={1}
            ratingScore="4.6/5"
          />
          
          <StrategyCard
            title="MACD Power"
            badgeText="Advanced"
            badgeVariant="yellow"
            monthlyReturn="+22.7%"
            description="Uses MACD indicator crossovers to find high-probability entry and exit points."
            chartData={macdChartData}
            minInvestment="$500"
            riskLevel={4}
            ratingScore="4.7/5"
          />
        </div>
        
        <div className="mt-8 text-center">
          <Link href="#" className="inline-flex items-center text-primary hover:text-primary/90">
            View all strategies <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}
