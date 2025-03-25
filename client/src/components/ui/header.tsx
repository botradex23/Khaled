import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "wouter";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-card border-b border-border py-4 px-6 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-primary font-bold text-2xl mr-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Cryptex
            </span>
          </div>
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
          <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Learn
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          <Button variant="default" className="bg-primary hover:bg-primary/90">
            Sign Up
          </Button>
          <Button variant="outline" className="border-border hover:border-primary">
            Login
          </Button>
          
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
          <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Learn
          </Link>
        </nav>
      )}
    </header>
  );
}
