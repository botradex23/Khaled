import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<T> {
  // Check if X-Test-Admin exists in localStorage and add it to headers if it does
  const testAdmin = localStorage.getItem('x-test-admin');
  
  // Determine if we're in Replit environment
  const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.replit.dev');
  
  // In Replit we need to use the base URL without port specification
  // as Replit proxies everything through the same domain
  const fullUrl = isReplit && url.startsWith('/api') 
    ? `${window.location.protocol}//${window.location.hostname}${url}` // Use protocol and hostname without port
    : url;
    
  console.log(`API Request to: ${fullUrl} (original URL: ${url})`);
  
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(testAdmin ? { "X-Test-Admin": testAdmin } : {}),
    ...(options?.headers || {})
  };

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Check if X-Test-Admin exists in localStorage and add it to headers if it does
    const testAdmin = localStorage.getItem('x-test-admin');
    
    // Determine if we're in Replit environment
    const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.replit.dev');
    
    // Get the URL from the query key
    const url = queryKey[0] as string;
    
    // In Replit we need to use the base URL without port specification
    // as Replit proxies everything through the same domain
    const fullUrl = isReplit && url.startsWith('/api') 
      ? `${window.location.protocol}//${window.location.hostname}${url}` // Use protocol and hostname without port
      : url;
      
    console.log(`Query fetch to: ${fullUrl} (original URL: ${url})`);
    
    const headers: Record<string, string> = {
      ...(testAdmin ? { "X-Test-Admin": testAdmin } : {})
    };
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
