import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email ? user.email[0].toUpperCase() : "U";
  };

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return "";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email ? user.email.split("@")[0] : "";
  };

  return (
    <header className="bg-card border-b border-border py-4 px-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <div className="text-primary font-bold text-2xl mr-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                Cryptex
              </span>
            </div>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/bots" className="text-muted-foreground hover:text-primary transition-colors">
            Bots
          </Link>
          <Link href="/markets" className="text-muted-foreground hover:text-primary transition-colors">
            Markets
          </Link>
          <Link href="/learn" className="text-muted-foreground hover:text-primary transition-colors">
            Learn
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center">
              <span className="mr-3 text-sm hidden sm:block">שלום, {getUserDisplayName()}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>פרופיל</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>התנתק</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Link href="/register">
                <Button variant="default" className="bg-primary hover:bg-primary/90">
                  Sign Up
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="border-border hover:border-primary">
                  Login
                </Button>
              </Link>
            </>
          )}
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            className="md:hidden text-muted-foreground hover:text-white" 
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 bg-card border-b border-border py-4 px-6 flex flex-col space-y-4">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link href="/bots" className="text-muted-foreground hover:text-primary transition-colors">
            Bots
          </Link>
          <Link href="/markets" className="text-muted-foreground hover:text-primary transition-colors">
            Markets
          </Link>
          <Link href="/learn" className="text-muted-foreground hover:text-primary transition-colors">
            Learn
          </Link>
          {isAuthenticated && (
            <Button 
              variant="ghost" 
              className="justify-start p-0 h-auto font-normal hover:bg-transparent text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              התנתק
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}
