import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import RegistrationForm from "@/components/ui/registration-form";

export default function Register() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <RegistrationForm />
      </main>
      <Footer />
    </div>
  );
}