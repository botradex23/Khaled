import React from "react";
import { 
  Bot, 
  LineChart,
  ShieldCheck
} from "lucide-react";

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 bg-background rounded-xl hover:shadow-lg transition-shadow">
      <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default function Features() {
  return (
    <section className="bg-card py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How Tradeliy Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform makes automated crypto trading accessible to everyone with 
            pre-built strategies and real-time monitoring.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Bot className="text-primary text-xl" />}
            title="Automated Bots"
            description="Choose from pre-built trading strategies or customize your own without any coding."
          />
          
          <FeatureCard
            icon={<LineChart className="text-primary text-xl" />}
            title="Real-time Analytics"
            description="Monitor performance with advanced charts and gain insights to optimize your strategy."
          />
          
          <FeatureCard
            icon={<ShieldCheck className="text-primary text-xl" />}
            title="Risk Management"
            description="Advanced stop-loss features and risk settings to protect your investments."
          />
        </div>
      </div>
    </section>
  );
}
