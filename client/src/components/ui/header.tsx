import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, User, Gauge, BarChart3, BookOpen, Grid, Activity, LayoutGrid, Settings } from "lucide-react";

export default function Header() {
  const [location] = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", icon: <Gauge className="h-4 w-4 mr-2" /> },
    { to: "/markets", label: "Markets", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
    { to: "/bots", label: "Bots", icon: <Grid className="h-4 w-4 mr-2" /> },
    { to: "/learn", label: "Learn", icon: <BookOpen className="h-4 w-4 mr-2" /> },
    { to: "/api-status", label: "API Status", icon: <Activity className="h-4 w-4 mr-2" /> },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary text-xl font-bold cursor-pointer">
                Cryptex
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          {!isMobile && (
            <nav className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link key={link.to} href={link.to}>
                  <span
                    className={`flex items-center text-sm font-medium ${
                      location === link.to
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-primary transition-colors"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Link href="/dashboard">
                        <span className="flex items-center">
                          <Gauge className="h-4 w-4 mr-2" />
                          Dashboard
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/settings">
                        <span className="flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={toggleMenu}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && isOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link key={link.to} href={link.to} onClick={closeMenu}>
                  <span
                    className={`flex items-center text-sm font-medium ${
                      location === link.to
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary transition-colors"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}