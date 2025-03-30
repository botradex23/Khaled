import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

export default function ApiStatus() {
  // Query OKX API status
  const okxQuery = useQuery({
    queryKey: ["/api/okx/status"],
    retry: 1
  });

  // Query Binance API status
  const binanceQuery = useQuery({
    queryKey: ["/api/binance/status"],
    retry: 1
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container max-w-6xl pt-24 pb-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Connection Status</h1>
          <p className="text-muted-foreground">
            Check the connection status to exchange APIs.
            The system should be connected to the testnet in all exchanges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Binance Status */}
          <ApiStatusCard
            title="Binance API"
            query={binanceQuery}
            getStatus={(data) => ({
              isConnected: data?.connected || false,
              authStatus: data?.authenticated || false,
              message: data?.message || "",
              environment: data?.isTestnet ? "Testnet" : "Mainnet",
              details: data
            })}
          />

          {/* OKX Status */}
          <ApiStatusCard
            title="OKX API"
            query={okxQuery}
            getStatus={(data) => ({
              isConnected: data?.connected || false,
              authStatus: data?.authenticated || false,
              message: data?.message || "",
              environment: data?.isDemoMode ? "Demo/Testnet" : "Mainnet",
              details: data
            })}
          />
        </div>

        <div className="mt-8 border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">API Integration Notes</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <Info className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
              <span>Binance API uses the <Badge variant="outline">BINANCE_API_KEY</Badge> and <Badge variant="outline">BINANCE_SECRET_KEY</Badge> environment variables.</span>
            </li>
            <li className="flex items-start">
              <Info className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
              <span>OKX API uses the <Badge variant="outline">OKX_API_KEY</Badge>, <Badge variant="outline">OKX_SECRET_KEY</Badge>, and <Badge variant="outline">OKX_PASSPHRASE</Badge> environment variables.</span>
            </li>
            <li className="flex items-start mt-4">
              <AlertTriangle className="h-5 w-5 text-warning mr-2 flex-shrink-0 mt-0.5" />
              <span>Working with testnet: The system is configured to work with a testnet environment that provides a full portal for testing, without affecting real data or real funds.</span>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}

interface ApiStatusCardProps {
  title: string;
  query: any;
  getStatus: (data: any) => {
    isConnected: boolean;
    authStatus: boolean;
    message: string;
    environment: string;
    details: any;
  };
}

function ApiStatusCard({ title, query, getStatus }: ApiStatusCardProps) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>Checking connection...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{title}</CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>Connection error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <span>Failed to connect to API endpoint</span>
          </div>
          <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const status = getStatus(data);
  const variant = status.isConnected ? (status.authStatus ? "success" : "warning") : "destructive";
  const cardClass = status.isConnected 
    ? (status.authStatus ? "border-green-200" : "border-yellow-200") 
    : "border-red-200";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <Badge variant={variant as any}>
            {status.isConnected 
              ? (status.authStatus ? "Connected" : "Partial") 
              : "Disconnected"}
          </Badge>
        </div>
        <CardDescription>
          Environment: {status.environment}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          {status.isConnected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          <span>API Connection: {status.isConnected ? "Success" : "Failed"}</span>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          {status.authStatus ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            status.isConnected ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )
          )}
          <span>Authentication: {status.authStatus ? "Success" : "Failed"}</span>
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">{status.message}</p>
      </CardContent>
    </Card>
  );
}