import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { CheckCircle, XCircle, AlertTriangle, Info, Database } from "lucide-react";

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
  
  // Query Database status
  const dbQuery = useQuery({
    queryKey: ["/api/database/status"],
    retry: 1
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container max-w-6xl pt-24 pb-12 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <p className="text-muted-foreground">
            Check the connection status of databases and exchange APIs.
            The system should be connected to the testnet in all exchanges.
          </p>
        </div>
        
        {/* Database Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Database Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Status Card */}
            <DatabaseStatusCard query={dbQuery} />
          </div>
        </div>
        
        {/* Exchange API Status Section */}
        <h2 className="text-xl font-bold mb-4">Exchange API Status</h2>
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

function DatabaseStatusCard({ query }: { query: any }) {
  const { data, isLoading, error } = query;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Database Status</CardTitle>
          <CardDescription>Checking connections...</CardDescription>
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
            <CardTitle>Database Status</CardTitle>
            <Badge variant="destructive">Error</Badge>
          </div>
          <CardDescription>Connection error</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <XCircle className="h-5 w-5" />
            <span>Failed to check database status</span>
          </div>
          <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Parse connection statuses
  const pgConnected = data?.connections?.postgresql?.connected || false;
  const mongoConnected = data?.connections?.mongodb?.connected || false;
  const allConnected = pgConnected && mongoConnected;
  const anyConnected = pgConnected || mongoConnected;
  const isMongoSimulated = data?.connections?.mongodb?.isSimulated ?? true; // Is MongoDB connection simulated
  
  // Determine badge styling
  let badgeClass = "";
  let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
  
  if (allConnected) {
    badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
  } else if (anyConnected) {
    badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    badgeVariant = "secondary";
  } else {
    badgeVariant = "destructive";
  }
  
  const cardClass = allConnected 
    ? "border-green-200" 
    : (anyConnected ? "border-yellow-200" : "border-red-200");

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Database Status</CardTitle>
          <Badge variant={badgeVariant} className={badgeClass}>
            {allConnected 
              ? "All Connected" 
              : (anyConnected ? "Partial" : "Disconnected")}
          </Badge>
        </div>
        <CardDescription>
          Database connection status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* PostgreSQL Connection */}
          <div className="flex items-center gap-2">
            <Database className={`h-5 w-5 ${pgConnected ? "text-green-500" : "text-destructive"}`} />
            <div className="flex-1">
              <div className="font-medium">PostgreSQL</div>
              <p className="text-sm text-muted-foreground">
                {data?.connections?.postgresql?.description || "Connection status unknown"}
              </p>
            </div>
            <Badge variant={pgConnected ? "default" : "destructive"} className={pgConnected ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
              {pgConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          {/* MongoDB Connection */}
          <div className="flex items-center gap-2">
            <Database className={`h-5 w-5 ${mongoConnected ? "text-green-500" : "text-destructive"}`} />
            <div className="flex-1">
              <div className="font-medium">
                MongoDB {isMongoSimulated && <span className="text-amber-600 text-xs font-normal">(Simulated)</span>}
              </div>
              <p className="text-sm text-muted-foreground">
                {data?.connections?.mongodb?.description || "Connection status unknown"}
                {mongoConnected && isMongoSimulated && (
                  <span className="block text-amber-600 text-xs mt-1">
                    Data stored in memory only. Not persisted to actual MongoDB.
                  </span>
                )}
              </p>
            </div>
            <Badge variant={mongoConnected ? "default" : "destructive"} className={mongoConnected ? "bg-green-100 text-green-800 hover:bg-green-200" : ""}>
              {mongoConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-4">
          {data?.message || "Database status check completed"}
        </p>
        
        {/* הסבר נוסף על הסימולציות */}
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <h4 className="text-sm font-medium text-amber-800">Database Integration Notes</h4>
          <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc pl-4">
            <li>PostgreSQL is used as the primary database for structured data</li>
            <li>MongoDB (currently simulated) is used for API key storage</li>
            <li>API Keys are securely encrypted before storage in either database</li>
            <li>MongoDB connection requires additional configuration for actual storage</li>
          </ul>
          
          {isMongoSimulated && (
            <div className="mt-3 p-2 bg-amber-100 rounded text-xs">
              <strong className="text-amber-800">Why MongoDB is simulated:</strong>
              <p className="mt-1 text-amber-700">
                The application currently uses a simulation of MongoDB for storing API keys. 
                Even though your MongoDB is working correctly, the app cannot connect to it
                due to missing dependencies that can't be installed in this environment.
                Your API keys are still saved, but they're stored in memory (not in the real MongoDB database).
              </p>
              <p className="mt-1 text-amber-700">
                <strong>Solution options:</strong>
              </p>
              <ol className="list-decimal pl-4 text-amber-700 space-y-1">
                <li>Deploy this application to a full server environment where all dependencies can be installed</li>
                <li>Continue using the simulation (API keys will work but will not persist between application restarts)</li>
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
  // Determine badge styling
  let badgeClass = "";
  let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "default";
  
  if (status.isConnected) {
    if (status.authStatus) {
      badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
    } else {
      badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      badgeVariant = "secondary";
    }
  } else {
    badgeVariant = "destructive";
  }
  
  const cardClass = status.isConnected 
    ? (status.authStatus ? "border-green-200" : "border-yellow-200") 
    : "border-red-200";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <Badge variant={badgeVariant} className={badgeClass}>
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