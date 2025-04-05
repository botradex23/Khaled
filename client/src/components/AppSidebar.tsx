import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Activity,
  Grid,
  CircleDollarSign,
  Home,
  Settings,
  HelpCircle,
  TrendingUp,
  Bot,
  Brain,
  LineChart,
  LayoutDashboard,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { SiBinance } from "react-icons/si";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AppSidebar() {
  const [location] = useLocation();
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    markets: true,
    bots: true,
    account: true
  });

  // Toggle category open/closed state
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Navigation items organized by categories
  const navCategories = [
    {
      id: 'main',
      title: 'ראשי',
      items: [
        { name: "דאשבורד", href: "/dashboard", icon: LayoutDashboard, description: "סקירה כללית ותמונת מצב עדכנית" },
        { name: "שוק בזמן אמת", href: "/live-market", icon: TrendingUp, description: "נתוני מחירים ומגמות בזמן אמת" },
      ]
    },
    {
      id: 'markets',
      title: 'שווקים',
      items: [
        { name: "רשימת מטבעות", href: "/markets", icon: BarChart3, description: "רשימה מלאה של כל המטבעות הזמינים" },
        { name: "צפייה בכל השווקים", href: "/binance", icon: LineChart, description: "סקירה מורחבת של כל השווקים" },
        { name: "נתוני מחירים", href: "/market-prices", icon: TrendingUp, description: "מחירים מפורטים ונתוני השוואה" },
      ]
    },
    {
      id: 'bots',
      title: 'בוטים ומסחר',
      items: [
        { name: "ניהול בוטים", href: "/bots", icon: Bot, description: "ניהול וסקירת הבוטים הפעילים" },
        { name: "בוט AI Grid", href: "/ai-grid-bot", icon: Grid, description: "בוט מסחר בשיטת רשת חכמה" },
        { name: "בוט DCA", href: "/dca-bot", icon: CircleDollarSign, description: "בוט עלות ממוצעת בדולרים" },
        { name: "בוט MACD", href: "/macd-bot", icon: LineChart, description: "בוט מבוסס אינדיקטור MACD" },
        { name: "מסחר AI", href: "/ai-trading", icon: Brain, isNew: true, description: "מסחר באמצעות בינה מלאכותית" },
        { name: "ניהול סיכונים", href: "/risk-management", icon: ShieldAlert, description: "הגדרות סיכון ובטיחות" },
        { name: "מסחר נייר", href: "/binance", icon: SiBinance, description: "התנסות במסחר ללא כסף אמיתי" },
      ]
    },
    {
      id: 'account',
      title: 'חשבון והגדרות',
      items: [
        { name: "מפתחות API", href: "/api-keys", icon: Settings, description: "ניהול מפתחות API לחיבור לבורסות" },
        { name: "סטטוס API", href: "/api-status", icon: Activity, description: "בדיקת מצב חיבורי ה-API" },
        { name: "חשבון", href: "/account", icon: Home, description: "ניהול פרטי חשבון וסיסמה" },
      ]
    },
    {
      id: 'help',
      title: 'עזרה ולמידה',
      items: [
        { name: "מדריך למידה", href: "/learn", icon: BookOpen, description: "מדריכים ותיעוד על שימוש במערכת" },
        { name: "הדגמה", href: "/bot-demo", icon: HelpCircle, description: "הדגמה ראשונית של בוטים ומסחר" },
      ]
    }
  ];

  const isActive = (href: string) => {
    return location === href;
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-background border-r border-border text-foreground z-40 pt-16 overflow-y-auto pb-24">
      {/* Logo */}
      <div className="px-6 py-4 border-b border-border flex items-center">
        <LineChart className="w-6 h-6 text-primary mr-2" />
        <h1 className="text-xl font-bold text-primary">Tradeliy</h1>
      </div>

      {/* Navigation Links */}
      <nav className="px-2 py-2">
        <TooltipProvider>
          {navCategories.map((category) => (
            <div key={category.id} className="mb-2">
              {/* Category title - make it collapsible for non-main categories */}
              {category.id !== 'main' ? (
                <Collapsible 
                  open={openCategories[category.id]} 
                  onOpenChange={() => toggleCategory(category.id)}
                  className="w-full"
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <span>{category.title}</span>
                    {openCategories[category.id] ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-1 mt-1">
                      {category.items.map((item) => (
                        <li key={item.name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={item.href}>
                                <a
                                  className={cn(
                                    "flex items-center px-4 py-2.5 rounded-md transition-colors text-sm",
                                    isActive(item.href)
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  )}
                                >
                                  {item.icon === SiBinance ? (
                                    <SiBinance className="h-4 w-4 mr-3 flex-shrink-0" />
                                  ) : (
                                    <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                                  )}
                                  <span>{item.name}</span>
                                  {item.isNew && (
                                    <span className="ml-2 text-xs bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded-md text-[10px] font-medium">
                                      חדש
                                    </span>
                                  )}
                                </a>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px]">
                              <p>{item.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                // Main category is always expanded
                <div>
                  <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                    {category.title}
                  </div>
                  <ul className="space-y-1 mt-1">
                    {category.items.map((item) => (
                      <li key={item.name}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={item.href}>
                              <a
                                className={cn(
                                  "flex items-center px-4 py-2.5 rounded-md transition-colors text-sm",
                                  isActive(item.href)
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                                <span>{item.name}</span>
                              </a>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[200px]">
                            <p>{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Help section at the bottom */}
      <div className="px-4 pt-4 pb-2 absolute bottom-0 left-0 w-full bg-background border-t border-border">
        <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
          <div className="flex items-start">
            <Info className="h-4 w-4 mr-2 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">זקוק לעזרה?</p>
              <p>לחץ על סמלי הממשק לקבלת עזרה או בקר בעמוד <Link href="/learn"><a className="text-primary">המדריכים</a></Link></p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}