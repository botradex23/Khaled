import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";
import { Skeleton } from "./skeleton";
import { BarChart3, LineChart } from "lucide-react";
import { PaperTradingAccount } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface PaperTradingStatsProps {
  account: PaperTradingAccount;
}

export function PaperTradingStats({ account }: PaperTradingStatsProps) {
  // Query for getting trading stats
  const {
    data: stats,
    isLoading: isStatsLoading
  } = useQuery<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: string;
    totalProfitLossPercent: string;
    averageProfitLoss: string;
    averageProfitLossPercent: string;
  }>({
    queryKey: ["/api/paper-trading/stats"],
    queryFn: async () => {
      const res = await fetch('/api/paper-trading/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to fetch trading statistics');
      }
      
      return await res.json();
    },
    enabled: !!account?.id,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>ניתוח ביצועים</CardTitle>
        <CardDescription>סטטיסטיקות מפורטות של ביצועי המסחר שלך</CardDescription>
      </CardHeader>
      <CardContent>
        {isStatsLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">סטטיסטיקות עסקאות</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">סה"כ עסקאות</span>
                    <span className="font-medium">{stats.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">עסקאות מרוויחות</span>
                    <span className="font-medium text-green-500">{stats.winningTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">עסקאות מפסידות</span>
                    <span className="font-medium text-red-500">{stats.losingTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">אחוז הצלחה</span>
                    <span className="font-medium">{stats.winRate.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">ביצועים כספיים</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">רווח/הפסד כולל</span>
                    <span className={`font-medium ${parseFloat(stats.totalProfitLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${parseFloat(stats.totalProfitLoss).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">אחוז רווח/הפסד</span>
                    <span className={`font-medium ${parseFloat(stats.totalProfitLossPercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(stats.totalProfitLossPercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">רווח/הפסד ממוצע לעסקה</span>
                    <span className={`font-medium ${parseFloat(stats.averageProfitLoss) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${parseFloat(stats.averageProfitLoss).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">אחוז רווח/הפסד ממוצע</span>
                    <span className={`font-medium ${parseFloat(stats.averageProfitLossPercent) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {parseFloat(stats.averageProfitLossPercent).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <LineChart className="h-24 w-24 mx-auto mb-4 text-primary opacity-60" />
                <p className="text-muted-foreground">
                  ויזואליזציה גרפית של ביצועי המסחר תהיה זמינה בקרוב.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">אין נתונים זמינים</h3>
            <p>התחל לסחור כדי לראות סטטיסטיקות ביצועים.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}