import Header from "../components/ui/header";
import Hero from "../components/ui/hero";
import Features from "../components/ui/features";
import BotStrategies from "../components/ui/bot-strategies";
import PerformanceMetrics from "../components/ui/performance-metrics";
import Pricing from "../components/ui/pricing";
import RegistrationForm from "../components/ui/registration-form";
import Footer from "../components/ui/footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-24 pb-12">
        <Hero />
        <Features />
        <BotStrategies />
        <PerformanceMetrics />
        <Pricing />
        <RegistrationForm />
      </main>
      <Footer />
    </div>
  );
}
