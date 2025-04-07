import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { AlertCircle, Info, Shield, DollarSign, TrendingDown } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

interface RiskManagementSectionProps {
  botType: 'ai-grid' | 'dca' | 'macd';
}

export default function RiskManagementSection({ botType }: RiskManagementSectionProps) {
  const form = useFormContext();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Shield className="h-5 w-5 mr-2 text-primary" /> 
          ניהול סיכונים
        </CardTitle>
        <CardDescription>
          הגדר את הגדרות ניהול הסיכונים שלך להגנה על ההשקעה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stop Loss */}
        <FormField
          control={form.control}
          name="stopLossPercentage"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel className="flex items-center">
                  Stop Loss 
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="w-80 p-2">
                        <p>Stop Loss הוא המחיר בו העסקה תיסגר אוטומטית כדי להגביל הפסדים.
                        האחוז מייצג את הירידה המקסימלית מנקודת הכניסה.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <span className="text-muted-foreground font-medium">{value}%</span>
              </div>
              <FormControl>
                <Slider
                  min={0.5}
                  max={20}
                  step={0.5}
                  defaultValue={[value]}
                  onValueChange={(vals) => onChange(vals[0])}
                  className="mt-2"
                />
              </FormControl>
              <FormDescription className="flex items-center text-xs text-red-500">
                <AlertCircle className="h-3 w-3 mr-1" />
                הגבלת הפסד - הבוט יסגור פוזיציות כשההפסד מגיע לאחוז זה
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Take Profit */}
        <FormField
          control={form.control}
          name="takeProfitPercentage"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel className="flex items-center">
                  Take Profit
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="w-80 p-2">
                        <p>Take Profit הוא המחיר בו העסקה תיסגר אוטומטית כדי לממש רווחים.
                        האחוז מייצג את העלייה המינימלית מנקודת הכניסה.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <span className="text-muted-foreground font-medium">{value}%</span>
              </div>
              <FormControl>
                <Slider
                  min={0.5}
                  max={50}
                  step={0.5}
                  defaultValue={[value]}
                  onValueChange={(vals) => onChange(vals[0])}
                  className="mt-2"
                />
              </FormControl>
              <FormDescription className="flex items-center text-xs text-green-500">
                <TrendingDown className="h-3 w-3 mr-1" />
                מימוש רווח - הבוט יסגור פוזיציות כשהרווח מגיע לאחוז זה
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Max Investment Per Trade */}
        <FormField
          control={form.control}
          name="maxInvestmentPerTrade"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                השקעה מקסימלית לעסקה בודדת
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="w-80 p-2">
                      <p>הגבלת סכום ההשקעה המקסימלי לעסקה בודדת מקטינה את הסיכון הכולל בפוזיציה.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="number" min="1" className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormDescription>
                הגבלת הסכום לכל עסקה מפזרת את הסיכון
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Emergency Stop */}
        <FormField
          control={form.control}
          name="emergencyStopEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2 pt-2 border-t">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  עצירת חירום
                </FormLabel>
                <FormDescription>
                  עצור את הבוט באופן אוטומטי אם ההפסד הכולל עולה על {form.watch('stopLossPercentage') * 2}% מערך התיק
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Additional strategy-specific risk controls */}
        {botType === 'ai-grid' && (
          <FormField
            control={form.control}
            name="useAdaptiveRiskAdjustment"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2 pt-2 border-t">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    התאמת סיכון אדפטיבית
                  </FormLabel>
                  <FormDescription>
                    מערכת AI תתאים את רמת הסיכון באופן דינמי על סמך תנודתיות שוק וביצועי הבוט
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        {botType === 'macd' && (
          <FormField
            control={form.control}
            name="useSignalConfirmation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2 pt-2 border-t">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    אימות אותות
                  </FormLabel>
                  <FormDescription>
                    השתמש באינדיקטור נוסף (RSI) לאימות אותות MACD כדי להקטין אותות שווא
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}

        {botType === 'dca' && (
          <FormField
            control={form.control}
            name="useDynamicDCA"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-2 pt-2 border-t">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    DCA דינמי
                  </FormLabel>
                  <FormDescription>
                    התאם את גודל הרכישות באופן דינמי בהתאם לתנודות המחיר - רכישות גדולות יותר בירידות
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}