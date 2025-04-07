import { Check, X } from "lucide-react";
import { Button } from "./button";

type PlanFeature = {
  text: string;
  included: boolean;
};

type PricingPlanProps = {
  title: string;
  description: string;
  price: string;
  popular?: boolean;
  features: PlanFeature[];
  buttonText: string;
};

function PricingPlan({ 
  title, 
  description, 
  price, 
  popular = false, 
  features, 
  buttonText 
}: PricingPlanProps) {
  return (
    <div className={`bg-card rounded-xl overflow-hidden ${
      popular 
        ? "border-2 border-primary relative" 
        : "border border-border hover:border-primary transition-colors"
    }`}>
      {popular && (
        <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1">
          POPULAR
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <div className="mb-6">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              {feature.included ? (
                <>
                  <Check className="h-5 w-5 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>{feature.text}</span>
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-muted-foreground mt-0.5 mr-2 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature.text}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        
        <Button className="w-full bg-primary hover:bg-primary/90">
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

export default function Pricing() {
  const starterFeatures = [
    { text: "Up to 3 active bots", included: true },
    { text: "Basic strategies", included: true },
    { text: "Standard performance metrics", included: true },
    { text: "Email support", included: true },
    { text: "Advanced strategies", included: false },
    { text: "API access", included: false }
  ];

  const professionalFeatures = [
    { text: "Up to 10 active bots", included: true },
    { text: "Basic & Advanced strategies", included: true },
    { text: "Advanced performance metrics", included: true },
    { text: "Priority email support", included: true },
    { text: "Strategy customization", included: true },
    { text: "API access", included: false }
  ];

  const enterpriseFeatures = [
    { text: "Unlimited active bots", included: true },
    { text: "All strategy types", included: true },
    { text: "Advanced & custom metrics", included: true },
    { text: "24/7 dedicated support", included: true },
    { text: "Custom strategy development", included: true },
    { text: "Full API access", included: true }
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your trading needs and scale as you grow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <PricingPlan
            title="Starter"
            description="Perfect for beginners exploring automated trading"
            price="$19"
            features={starterFeatures}
            buttonText="Get Started"
          />
          
          <PricingPlan
            title="Professional"
            description="For serious traders looking to maximize returns"
            price="$49"
            popular={true}
            features={professionalFeatures}
            buttonText="Get Started"
          />
          
          <PricingPlan
            title="Enterprise"
            description="For institutional investors and trading firms"
            price="$199"
            features={enterpriseFeatures}
            buttonText="Contact Sales"
          />
        </div>
      </div>
    </section>
  );
}
