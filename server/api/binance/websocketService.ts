import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { binanceMarketService, BinanceTickerPrice } from './marketPriceService';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Proxy details for Binance WebSocket connection
// Cycle through available proxies when one fails
const AVAILABLE_PROXIES = [
  { host: '86.38.234.176', port: 6630 },
  { host: '154.36.110.199', port: 6853 },
  { host: '45.151.162.198', port: 6600 },
];

// Maximum number of connection retry attempts before giving up
const MAX_PROXY_RETRIES = 3;

// Check if proxy is enabled from environment
const USE_PROXY = process.env.USE_PROXY === 'true';

// Real-time price updates event emitter class
class BinanceWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectInterval: number = 5000; // 5 seconds for reconnect attempts
  private currencyPairs: string[] = [
    'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
    'adausdt', 'dogeusdt', 'dotusdt', 'maticusdt', 'linkusdt',
    'avaxusdt', 'uniusdt', 'shibusdt', 'ltcusdt', 'atomusdt',
    'nearusdt', 'bchusdt', 'filusdt', 'trxusdt', 'xlmusdt'
  ];

  // Status tracking fields
  private lastConnectionError: string | null = null;
  private currentProxy: {host: string, port: number} | null = null;
  private connectionAttempts: number = 0;
  private maxRetries: number = MAX_PROXY_RETRIES;
  private lastMessageTime: number = 0;

  constructor() {
    super();
    // Register the error event handler
    this.on('error', this.handleError.bind(this));
  }

  // Simulation mode properties
  private simulationMode: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationIntervalTime: number = 5000; // Update every 5 seconds
  private simulationStartTime: number = 0;
  private importantCurrencyPairs: string[] = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT',
    'AVAXUSDT', 'UNIUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT',
    'NEARUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'XLMUSDT'
  ];
  private lastPrices: Record<string, number> = {};

  /**
   * Connect to Binance WebSocket service
   * Attempts to connect using available proxies, with failover capability
   */
  public connect(proxyIndex: number = 0): void {
    if (this.isConnected || this.ws) {
      console.log('WebSocket connection already exists');
      return;
    }

    try {
      // Build URL for multiple streams
      const streams = this.currencyPairs.map(pair => `${pair}@ticker`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
      
      console.log(`Connecting to Binance WebSocket: ${wsUrl}`);
      
      // Get proxy details - use either environment variables or try from our list
      const currentProxy = AVAILABLE_PROXIES[proxyIndex] || AVAILABLE_PROXIES[0];
      const proxyHost = process.env.PROXY_IP || currentProxy.host;
      const proxyPort = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : currentProxy.port;
      
      // Create proxy agent for WebSocket
      const proxyUsername = process.env.PROXY_USERNAME || 'ahjqspco';
      const proxyPassword = process.env.PROXY_PASSWORD || 'dzx3r1prpz9k';
      const proxyUrl = `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
      console.log(`Using HTTPS proxy for WebSocket: ${proxyHost}:${proxyPort} with user ${proxyUsername}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      
      // Create WebSocket options with proxy
      const wsOptions = {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://www.binance.com'
        }
      };
      
      // Connect to WebSocket using proxy
      this.ws = new WebSocket(wsUrl, wsOptions);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance WebSocket');
        this.isConnected = true;
        this.simulationMode = false;
        
        // Stop simulation if running
        this.stopSimulation();
        
        this.emit('connected');
        
        // Clear reconnect timer if exists
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });
      
      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          // Check if message contains price data
          if (message && message.data && message.data.s && message.data.p) {
            const ticker = {
              symbol: message.data.s, // Symbol (like BTCUSDT)
              price: parseFloat(message.data.p), // Current price
              priceChangePercent: parseFloat(message.data.P), // 24hr change percentage
              volume: message.data.v, // Trading volume
              timestamp: Date.now()
            };
            
            // Update price in our system
            binanceMarketService.updatePrice(ticker.symbol, ticker.price);
            
            // Save last price
            this.lastPrices[ticker.symbol] = ticker.price;
            
            // Emit event to all listeners
            this.emit('price-update', {
              symbol: ticker.symbol, 
              price: ticker.price,
              timestamp: Date.now(),
              source: 'binance-websocket'
            });
            
            // Emit specific event for each currency
            this.emit(`ticker:${ticker.symbol}`, ticker);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error: any) => {
        console.error('Binance WebSocket error:', error);
        this.emit('error', error);
        
        // Handle proxy authentication errors (407) by trying the next proxy
        if (error && (error.message?.includes('407') || error.code === 407)) {
          console.log('[WebSocket] Proxy authentication failed, trying next proxy...');
          
          // Try next proxy if available
          const nextProxyIndex = (proxyIndex + 1) % AVAILABLE_PROXIES.length;
          
          // Only try the next proxy if we haven't tried all of them
          if (nextProxyIndex !== proxyIndex) {
            console.log(`[WebSocket] Trying proxy ${nextProxyIndex + 1}/${AVAILABLE_PROXIES.length}`);
            
            // Close current connection if it exists
            if (this.ws) {
              try {
                this.ws.close();
              } catch (e) {
                // Ignore
              }
              this.ws = null;
              this.isConnected = false;
            }
            
            // Try connect with next proxy
            setTimeout(() => {
              this.connect(nextProxyIndex);
            }, 1000);
            return;
          }
        }
        
        // If geo-restricted (451) or payment required (402), start simulation
        if (error && (error.message?.includes('451') || error.code === 451 || 
                      error.message?.includes('402') || error.code === 402 ||
                      error.message?.includes('407') || error.code === 407)) {
          console.log('[WebSocket] Binance WebSocket connection failed due to proxy issues, switching to simulation mode');
          
          // Inform all services that we're using simulation
          console.log('Binance WebSocket switched to simulation mode due to connection issues (possibly geo-restricted)');
          
          // Start simulation mode for price updates
          this.startSimulation();
        }
      });
      
      this.ws.on('close', (code: number, reason: string) => {
        console.log(`Binance WebSocket closed with code ${code} and reason: ${reason}`);
        this.isConnected = false;
        this.ws = null;
        
        // Emit disconnected event
        this.emit('disconnected', { code, reason });
        
        // Start simulation when disconnected
        this.startSimulation();
        
        // Attempt to reconnect
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Error creating Binance WebSocket connection:', error);
      this.emit('error', error);
      
      // Start simulation when connection creation fails
      this.startSimulation();
      
      // Schedule reconnect attempt
      this.scheduleReconnect();
    }
  }
  
  /**
   * Start simulation mode for price updates
   * This mode is used when real connection to Binance is not available
   */
  private startSimulation(): void {
    // If simulation is already active, don't start again
    if (this.simulationMode && this.simulationInterval) {
      return;
    }
    
    console.log('Starting WebSocket simulation mode for price updates');
    this.simulationMode = true;
    this.simulationStartTime = Date.now();
    this.lastMessageTime = Date.now(); // Update last message time
    
    // Store this error for status reporting
    this.lastConnectionError = "Binance WebSocket connection failed. Using simulation mode for price data.";
    
    // Get initial prices from the service
    this.initializeSimulatedPrices();
    
    // Send initial update
    this.emitSimulatedPriceUpdates();
    
    // Set up periodic updates
    this.simulationInterval = setInterval(() => {
      this.emitSimulatedPriceUpdates();
      this.lastMessageTime = Date.now(); // Update last message time on each emit
    }, this.simulationIntervalTime);
    
    // Notify about simulation mode
    this.emit('simulation-started');
  }
  
  /**
   * עצירת מצב הסימולציה
   */
  private stopSimulation(): void {
    if (this.simulationInterval) {
      console.log('Stopping WebSocket simulation mode');
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.simulationMode = false;
  }
  
  /**
   * אתחול המחירים הראשוניים לסימולציה
   */
  private async initializeSimulatedPrices(): Promise<void> {
    try {
      // נסיון לקבל מחירים מדומים מהשירות המרכזי
      const prices = await binanceMarketService.getAllPrices();
      
      if (prices && prices.length > 0) {
        // עדכון המחירים הראשוניים
        prices.forEach((ticker: BinanceTickerPrice) => {
          this.lastPrices[ticker.symbol] = parseFloat(ticker.price);
        });
        
        console.log(`Initialized simulation with ${Object.keys(this.lastPrices).length} prices`);
      } else {
        // אם אין מחירים, אתחל ערכים ברירת מחדל
        this.initializeFallbackPrices();
      }
    } catch (error) {
      console.error('Failed to initialize simulated prices:', error);
      this.initializeFallbackPrices();
    }
  }
  
  /**
   * אתחול ערכי ברירת מחדל למחירים מדומים
   */
  private initializeFallbackPrices(): void {
    // ערכי ברירת מחדל מציאותיים למקרה של כשלון הטענה
    const defaultPrices: Record<string, number> = {
      'BTCUSDT': 69250.25,
      'ETHUSDT': 3475.50,
      'BNBUSDT': 608.75,
      'SOLUSDT': 188.15,
      'XRPUSDT': 0.6125,
      'ADAUSDT': 0.45,
      'DOGEUSDT': 0.16,
      'DOTUSDT': 8.25,
      'MATICUSDT': 0.78,
      'LINKUSDT': 15.85,
      'AVAXUSDT': 41.28,
      'UNIUSDT': 12.35,
      'SHIBUSDT': 0.00002654,
      'LTCUSDT': 93.21,
      'ATOMUSDT': 11.23,
      'NEARUSDT': 7.15,
      'BCHUSDT': 523.75,
      'FILUSDT': 8.93,
      'TRXUSDT': 0.1426,
      'XLMUSDT': 0.1392
    };
    
    this.lastPrices = { ...defaultPrices };
    console.log('Initialized fallback price simulation');
  }
  
  /**
   * יצירת עדכוני מחירים מדומים וריאליסטיים ושליחתם
   */
  private emitSimulatedPriceUpdates(): void {
    // נשתמש בכל המטבעות בלאסט פרייס במקום רק החשובים
    // כך נכלול את כל המטבעות שהוגדרו בברירת מחדל
    Object.keys(this.lastPrices).forEach(symbol => {
      // אם אין מחיר קודם, דלג
      if (!this.lastPrices[symbol]) {
        return;
      }
      
      // יצירת שינוי מחיר קטן מציאותי (-0.5% עד +0.5%)
      const priceChange = this.lastPrices[symbol] * (Math.random() * 0.01 - 0.005);
      const previousPrice = this.lastPrices[symbol];
      const newPrice = previousPrice + priceChange;
      
      // עדכון המחיר החדש במאגר
      this.lastPrices[symbol] = newPrice;
      
      // עדכון המחיר במערכת הכללית
      binanceMarketService.updatePrice(symbol, newPrice);
      
      // חישוב אחוז השינוי
      const changePercent = (priceChange / previousPrice) * 100;
      
      // שליחת עדכון המחיר לכל המאזינים
      this.emit('price-update', {
        symbol, 
        price: newPrice,
        timestamp: Date.now(),
        source: 'simulated'
      });
      
      // אם יש שינוי משמעותי (יותר מ-0.25%), שלח אירוע מיוחד
      if (Math.abs(changePercent) > 0.25) {
        this.emit('significant-price-change', {
          symbol,
          previousPrice,
          price: newPrice,
          changePercent,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * ניתוק מהשירות
   */
  public disconnect(): void {
    if (!this.isConnected || !this.ws) {
      return;
    }
    
    console.log('Disconnecting from Binance WebSocket');
    
    try {
      this.ws.close();
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
    
    this.isConnected = false;
    this.ws = null;
    this.emit('disconnected', { code: 1000, reason: 'Manual disconnect' });
  }

  /**
   * Schedule a reconnection attempt with proxy cycling
   * Will try all proxies in sequence before giving up
   */
  private scheduleReconnect(proxyIndex: number = 0): void {
    if (this.reconnectTimer) {
      return;
    }
    
    console.log(`Scheduling WebSocket reconnect in ${this.reconnectInterval}ms, will try proxy ${proxyIndex + 1}/${AVAILABLE_PROXIES.length}`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to Binance WebSocket');
      this.reconnectTimer = null;
      
      // Try to connect with the next proxy in sequence
      this.connect(proxyIndex);
    }, this.reconnectInterval);
  }

  /**
   * טיפול בשגיאות
   */
  private handleError(error: any): void {
    console.error('Binance WebSocket service error:', error);
    
    // אם יש שגיאת חיבור, נסה להתחבר מחדש
    if (!this.isConnected) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * בדיקה אם WebSocket מחובר
   */
  public isWebSocketConnected(): boolean {
    return this.isConnected && this.ws !== null;
  }
  
  /**
   * Get the last prices (real or simulated)
   */
  public getLastPrices(): Record<string, number> {
    return this.lastPrices;
  }

  /**
   * Add currency pairs to watch list
   */
  public addCurrencyPairs(pairs: string[]): void {
    pairs.forEach(pair => {
      const normalizedPair = pair.toLowerCase();
      if (!this.currencyPairs.includes(normalizedPair)) {
        this.currencyPairs.push(normalizedPair);
      }
    });
    
    // If already connected, reconnect with updated currency list
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
  
  /**
   * Check if simulation mode is active
   */
  public isSimulationMode(): boolean {
    return this.simulationMode;
  }
  
  /**
   * Get the current proxy being used
   */
  public getCurrentProxy(): {host: string, port: number} | null {
    return this.currentProxy;
  }
  
  /**
   * Get the last connection error
   */
  public getLastConnectionError(): string | null {
    return this.lastConnectionError;
  }
  
  /**
   * Get the number of connection attempts made
   */
  public getConnectionAttempts(): number {
    return this.connectionAttempts;
  }
  
  /**
   * Get the maximum number of retry attempts
   */
  public getMaxRetries(): number {
    return this.maxRetries;
  }
  
  /**
   * Get the timestamp of the last message received
   */
  public getLastMessageTime(): number {
    return this.lastMessageTime;
  }
}

// יצירת אינסטנס יחיד של השירות
export const binanceWebSocketService = new BinanceWebSocketService();

// התחל את החיבור כבר בייבוא המודול
// binanceWebSocketService.connect(); // לא להפעיל כאן, נפעיל בזמן אתחול השרת