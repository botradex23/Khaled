import { Link } from "wouter";
import { Twitter, MessageCircle, Send, Youtube } from "lucide-react";

type FooterLinkGroupProps = {
  title: string;
  links: { label: string; href: string }[];
};

function FooterLinkGroup({ title, links }: FooterLinkGroupProps) {
  return (
    <div>
      <h3 className="font-bold mb-4">{title}</h3>
      <ul className="space-y-2">
        {links.map((link, index) => (
          <li key={index}>
            <Link 
              href={link.href} 
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const platformLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Bot Marketplace", href: "/bots" },
    { label: "Analytics", href: "/dashboard" },
    { label: "API Documentation", href: "/learn" },
    { label: "API Status", href: "/api-status" }
  ];

  const resourceLinks = [
    { label: "Blog", href: "/learn" },
    { label: "Tutorials", href: "/learn" },
    { label: "Academy", href: "/learn" },
    { label: "Community Forum", href: "/learn" },
    { label: "Help Center", href: "/learn" }
  ];

  const companyLinks = [
    { label: "About Us", href: "/" },
    { label: "Careers", href: "/" },
    { label: "Press", href: "/" },
    { label: "Privacy Policy", href: "/" },
    { label: "Terms of Service", href: "/" }
  ];

  return (
    <footer className="bg-card border-t border-border py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="text-primary font-bold text-2xl mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                Cryptex
              </span>
            </div>
            <p className="text-muted-foreground mb-4">
              Automated crypto trading platform for everyone. No coding required.
            </p>
            <div className="flex space-x-4">
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                <Send className="h-5 w-5" />
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          <FooterLinkGroup title="Platform" links={platformLinks} />
          <FooterLinkGroup title="Resources" links={resourceLinks} />
          <FooterLinkGroup title="Company" links={companyLinks} />
        </div>
        
        <div className="border-t border-border mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm mb-4 md:mb-0">
            &copy; 2023 Cryptex. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}