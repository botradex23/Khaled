import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Activity,
  Grid,
  CircleDollarSign,
} from "lucide-react";
import { SiBinance } from "react-icons/si";

export default function AppSidebar() {
  const [location] = useLocation();

  // Navigation items for the sidebar
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Markets", href: "/markets", icon: BarChart3 },
    { name: "Bots", href: "/bots", icon: Grid },
    { name: "AI Trading", href: "/ai-trading", icon: Activity, isNew: true },
    { name: "Learn", href: "/learn", icon: BookOpen },
    { name: "API Status", href: "/api-status", icon: Activity },
    { name: "Binance", href: "/binance", icon: SiBinance },
  ];

  const isActive = (href: string) => {
    return location === href;
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-[#10131a] border-r border-[#1e2530] text-white z-40 pt-16">
      {/* Logo */}
      <div className="px-6 py-4 border-b border-[#1e2530]">
        <h1 className="text-xl font-bold text-[#037dd6]">Cryptex</h1>
      </div>

      {/* Navigation Links */}
      <nav className="px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link href={item.href}>
                <a
                  className={cn(
                    "flex items-center px-4 py-3 rounded-md transition-colors",
                    isActive(item.href)
                      ? "bg-[#1e2530] text-[#037dd6]"
                      : "text-gray-300 hover:bg-[#1e2530] hover:text-white"
                  )}
                >
                  {item.icon === SiBinance ? (
                    <SiBinance className="h-5 w-5 mr-3" />
                  ) : (
                    <item.icon className="h-5 w-5 mr-3" />
                  )}
                  <span>{item.name}</span>
                  {item.isNew && (
                    <span className="ml-2 text-xs bg-[#037dd6] text-white px-1.5 py-0.5 rounded-md">
                      חדש
                    </span>
                  )}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}