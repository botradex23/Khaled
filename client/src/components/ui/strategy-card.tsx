import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Line,
  LineChart,
  ResponsiveContainer
} from "recharts";
import { StrategyType, ChartData } from "@/types";

type StrategyCardProps = {
  title: string;
  badgeText: string;
  badgeVariant: "default" | "blue" | "green" | "yellow";
  monthlyReturn: string;
  description: string;
  chartData: ChartData[];
  minInvestment: string;
  riskLevel: number;
  ratingScore: string;
};

export default function StrategyCard({
  title,
  badgeText,
  badgeVariant,
  monthlyReturn,
  description,
  chartData,
  minInvestment,
  riskLevel,
  ratingScore
}: StrategyCardProps) {
  // Badge styling based on variant
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case "blue":
        return "bg-primary/10 text-primary";
      case "green":
        return "bg-secondary/10 text-secondary";
      case "yellow":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-primary/10 text-primary";
    }
  };

  // Get line color based on strategy type
  const getLineColor = () => {
    switch (badgeVariant) {
      case "blue":
        return "hsl(var(--primary))";
      case "green":
        return "hsl(var(--secondary))";
      case "yellow":
        return "hsl(35.5 91.7% 32.9%)";
      default:
        return "hsl(var(--primary))";
    }
  };

  return (
    <div className="gradient-border overflow-hidden rounded-xl transition-transform hover:scale-[1.02]">
      <div className="bg-card p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1">{title}</h3>
            <div className="flex items-center">
              <Badge variant="outline" className={`${getBadgeClass()} mr-2`}>
                {badgeText}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {ratingScore} <span className="text-yellow-400 text-xs">★</span>
              </span>
            </div>
          </div>
          <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-medium">
            {monthlyReturn} Monthly
          </div>
        </div>
        
        <p className="text-muted-foreground mb-4 text-sm">{description}</p>
        
        <div className="mb-4">
          <div className="h-[100px] bg-muted rounded">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getLineColor()} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <p className="text-muted-foreground">Min. Investment</p>
            <p className="text-white font-mono font-medium">{minInvestment}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk Level</p>
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < riskLevel 
                      ? i < 3 
                        ? "bg-emerald-500" 
                        : "bg-yellow-500"
                      : "bg-muted-foreground"
                  } ${i > 0 ? "ml-1" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
        
        <Button className="w-full bg-primary hover:bg-primary/90">
          Start Bot
        </Button>
      </div>
    </div>
  );
}
