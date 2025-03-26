import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { BookOpen, Video, Newspaper, Users, ExternalLink } from "lucide-react";

export default function Learn() {
  return (
    <div className="container max-w-7xl mx-auto py-16 px-4 mt-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Crypto Trading Education Center</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn how to trade cryptocurrency with our comprehensive resources, tutorials, and guides.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Getting Started Guide</CardTitle>
            <CardDescription>
              New to cryptocurrency trading? Start here with our beginner-friendly guide.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              <li className="flex items-center text-muted-foreground">
                • What is cryptocurrency?
              </li>
              <li className="flex items-center text-muted-foreground">
                • How to set up your first wallet
              </li>
              <li className="flex items-center text-muted-foreground">
                • Understanding blockchain technology
              </li>
              <li className="flex items-center text-muted-foreground">
                • Making your first trade
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/learn" className="w-full">
              <Button variant="outline" className="w-full">Read Guide</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <Video className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Video Tutorials</CardTitle>
            <CardDescription>
              Watch our step-by-step video tutorials on trading strategies and techniques.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              <li className="flex items-center text-muted-foreground">
                • Technical analysis fundamentals
              </li>
              <li className="flex items-center text-muted-foreground">
                • Reading candlestick patterns
              </li>
              <li className="flex items-center text-muted-foreground">
                • Using Cryptex's bot features
              </li>
              <li className="flex items-center text-muted-foreground">
                • Risk management strategies
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/learn" className="w-full">
              <Button variant="outline" className="w-full">Watch Videos</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <Newspaper className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Market Analysis</CardTitle>
            <CardDescription>
              Deep dive into the latest market trends, analysis, and predictions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              <li className="flex items-center text-muted-foreground">
                • Weekly market updates
              </li>
              <li className="flex items-center text-muted-foreground">
                • Expert trading insights
              </li>
              <li className="flex items-center text-muted-foreground">
                • Altcoin analysis
              </li>
              <li className="flex items-center text-muted-foreground">
                • Macro economic factors
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Link href="/learn" className="w-full">
              <Button variant="outline" className="w-full">Read Analysis</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Separator className="my-16" />

      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold mb-4">Advanced Trading Knowledge</h2>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Take your trading skills to the next level with our advanced resources and community.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Trading Strategies Library</CardTitle>
            <CardDescription>
              Browse our collection of proven trading strategies for various market conditions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-muted-foreground mb-4">
              Our library contains detailed explanations of various trading strategies including:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold">Grid Trading</h3>
                <p className="text-sm text-muted-foreground">
                  Profit from sideways markets by placing buy and sell orders at regular intervals.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold">DCA Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Reduce impact of volatility by investing fixed amounts at regular intervals.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold">MACD Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Use the Moving Average Convergence Divergence indicator for trend identification.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold">Pairs Trading</h3>
                <p className="text-sm text-muted-foreground">
                  Exploit price discrepancies between historically correlated asset pairs.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/bots" className="w-full">
              <Button className="w-full">Explore Strategies</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle>Community & Support</CardTitle>
            <CardDescription>
              Join our community of traders to share ideas, get help, and improve your skills.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Users className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Trading Forums</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with other traders, share your experiences, and get advice from experienced members.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Video className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Live Webinars</h3>
                  <p className="text-sm text-muted-foreground">
                    Join our weekly live webinars with professional traders and market analysts.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <ExternalLink className="h-8 w-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">Expert Network</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized advice from our network of certified cryptocurrency experts.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/learn" className="w-full">
              <Button className="w-full">Join Community</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Put Your Knowledge into Practice?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Now that you've learned the fundamentals, it's time to apply your knowledge with our automated trading platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Create Account
            </Button>
          </Link>
          <Link href="/bot-demo">
            <Button size="lg" variant="outline">Try Demo First</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}