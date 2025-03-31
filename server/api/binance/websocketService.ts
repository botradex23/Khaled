import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { binanceMarketService, BinanceTickerPrice } from './marketPriceService';
import { HttpsProxyAgent } from 'https-proxy-agent';

// פרטי הפרוקסי שעובד עם WebSocket של Binance
const PROXY_HOST = '185.199.228.220';
const PROXY_PORT = 7300;
const PROXY_USERNAME = 'ahjqspco';
const PROXY_PASSWORD = 'dzx3r1prpz9k';

// EventEmitter להעברת עדכוני מחירים בזמן אמת
class BinanceWebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectInterval: number = 5000; // 5 שניות לניסיון חיבור מחדש
  private currencyPairs: string[] = [
    'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
    'adausdt', 'dogeusdt', 'dotusdt', 'maticusdt', 'linkusdt',
    'avaxusdt', 'uniusdt', 'shibusdt', 'ltcusdt', 'atomusdt',
    'nearusdt', 'bchusdt', 'filusdt', 'trxusdt', 'xlmusdt'
  ];

  constructor() {
    super();
    // הגדרה של האירועים העיקריים שהשירות מפיץ
    this.on('error', this.handleError.bind(this));
  }

  // מאפיינים למצב סימולציה
  private simulationMode: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private simulationIntervalTime: number = 3000; // עדכון כל 3 שניות
  private importantCurrencyPairs: string[] = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT',
    'AVAXUSDT', 'UNIUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT',
    'NEARUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'XLMUSDT'
  ];
  private lastPrices: Record<string, number> = {};

  /**
   * התחברות לשירות WebSocket של Binance
   */
  public connect(): void {
    if (this.isConnected || this.ws) {
      console.log('WebSocket connection already exists');
      return;
    }

    try {
      // בניית ה-URL לפי הפורמט של Binance עבור multiple streams
      const streams = this.currencyPairs.map(pair => `${pair}@ticker`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
      
      console.log(`Connecting to Binance WebSocket: ${wsUrl}`);
      
      // יצירת מופע פרוקסי להתחברות ל-WebSocket
      const proxyUrl = `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}`;
      console.log(`Using HTTPS proxy for WebSocket: ${PROXY_HOST}:${PROXY_PORT}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      
      // יצירת אפשרויות WebSocket עם הפרוקסי
      const wsOptions = {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://www.binance.com'
        }
      };
      
      // התחברות ל-WebSocket דרך הפרוקסי
      this.ws = new WebSocket(wsUrl, wsOptions);
      
      this.ws.on('open', () => {
        console.log('Connected to Binance WebSocket');
        this.isConnected = true;
        this.simulationMode = false;
        
        // הפסק את הסימולציה אם היא רצה
        this.stopSimulation();
        
        this.emit('connected');
        
        // ניקוי טיימר של ניסיון חיבור מחדש אם יש
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });
      
      this.ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          // בדיקה שהודעה מכילה נתוני מחיר
          if (message && message.data && message.data.s && message.data.p) {
            const ticker = {
              symbol: message.data.s, // סמל המטבע (כמו BTCUSDT)
              price: parseFloat(message.data.p), // מחיר נוכחי
              priceChangePercent: parseFloat(message.data.P), // שינוי באחוזים ב-24 שעות
              volume: message.data.v, // נפח מסחר
              timestamp: Date.now()
            };
            
            // עדכון המחיר במערכת שלנו
            binanceMarketService.updatePrice(ticker.symbol, ticker.price);
            
            // שמירת המחיר האחרון
            this.lastPrices[ticker.symbol] = ticker.price;
            
            // שידור האירוע לכל המאזינים
            this.emit('price-update', {
              symbol: ticker.symbol, 
              price: ticker.price,
              timestamp: Date.now(),
              source: 'binance-websocket'
            });
            
            // שידור אירוע ספציפי לכל מטבע
            this.emit(`ticker:${ticker.symbol}`, ticker);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error: any) => {
        console.error('Binance WebSocket error:', error);
        this.emit('error', error);
        
        // במקרה ויש שגיאת חיבור עם קוד 451 (הגבלה גיאוגרפית), נפעיל סימולציה
        if (error && (error.message?.includes('451') || error.code === 451)) {
          console.log('[WebSocket] Binance WebSocket geo-restriction detected (451)');
          // מפעילים סימולציה
          this.startSimulation();
        }
      });
      
      this.ws.on('close', (code: number, reason: string) => {
        console.log(`Binance WebSocket closed with code ${code} and reason: ${reason}`);
        this.isConnected = false;
        this.ws = null;
        
        // הודעה על סגירת החיבור
        this.emit('disconnected', { code, reason });
        
        // מעבר למצב סימולציה במקרה של ניתוק
        this.startSimulation();
        
        // ניסיון חיבור מחדש
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('Error creating Binance WebSocket connection:', error);
      this.emit('error', error);
      
      // התחל סימולציה במקרה של שגיאה ביצירת החיבור
      this.startSimulation();
      
      // ניסיון חיבור מחדש
      this.scheduleReconnect();
    }
  }
  
  /**
   * התחלת מצב סימולציה של עדכוני מחירים
   */
  private startSimulation(): void {
    // אם הסימולציה כבר פעילה, אין צורך להתחיל שוב
    if (this.simulationMode && this.simulationInterval) {
      return;
    }
    
    console.log('Starting WebSocket simulation mode for price updates');
    this.simulationMode = true;
    
    // קבלת מחירים ראשוניים מהשירות
    this.initializeSimulatedPrices();
    
    // שליחת עדכון ראשוני
    this.emitSimulatedPriceUpdates();
    
    // הגדרת עדכונים תקופתיים
    this.simulationInterval = setInterval(() => {
      this.emitSimulatedPriceUpdates();
    }, this.simulationIntervalTime);
    
    // הודעה על מעבר למצב סימולציה
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
   * תזמון ניסיון חיבור מחדש
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    
    console.log(`Scheduling WebSocket reconnect in ${this.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to Binance WebSocket');
      this.reconnectTimer = null;
      this.connect();
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
   * קבלת המחירים האחרונים (אמיתיים או מדומים)
   */
  public getLastPrices(): Record<string, number> {
    return this.lastPrices;
  }

  /**
   * הוספת מטבעות למעקב
   */
  public addCurrencyPairs(pairs: string[]): void {
    pairs.forEach(pair => {
      const normalizedPair = pair.toLowerCase();
      if (!this.currencyPairs.includes(normalizedPair)) {
        this.currencyPairs.push(normalizedPair);
      }
    });
    
    // אם כבר מחובר, התחבר מחדש עם רשימת המטבעות המעודכנת
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

// יצירת אינסטנס יחיד של השירות
export const binanceWebSocketService = new BinanceWebSocketService();

// התחל את החיבור כבר בייבוא המודול
// binanceWebSocketService.connect(); // לא להפעיל כאן, נפעיל בזמן אתחול השרת