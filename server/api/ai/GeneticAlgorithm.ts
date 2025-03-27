/**
 * GeneticAlgorithm.ts
 * 
 * מערכת אלגוריתמים גנטיים לאופטימיזציה של אסטרטגיות מסחר
 * מיישמת את עקרונות האבולוציה להשבחת אסטרטגיות הבוט
 */

import fs from 'fs';
import path from 'path';
import { MarketState, StrategyType, StrategyParams, GridParams } from './ReinforcementLearning';
import { TimeFrame, Candle } from './DataCollector';

// כרומוזום מייצג סט של פרמטרים לאסטרטגיית מסחר
export interface Chromosome {
  id: string;                 // מזהה ייחודי לכרומוזום
  strategyType: StrategyType; // סוג האסטרטגיה
  params: StrategyParams;     // פרמטרים ספציפיים לאסטרטגיה
  fitness: number;            // ציון כושר של הכרומוזום
  generation: number;         // מספר הדור של הכרומוזום
  trades: ChromosomeTrade[];  // עסקאות שבוצעו על ידי כרומוזום זה
  created: number;            // זמן יצירת הכרומוזום
}

// עסקה שבוצעה על ידי כרומוזום
export interface ChromosomeTrade {
  action: 'BUY' | 'SELL';     // סוג הפעולה
  price: number;              // מחיר העסקה
  amount: number;             // כמות הנכס
  timestamp: number;          // זמן העסקה
  profit?: number;            // רווח/הפסד מהעסקה (אם מומשה)
}

// פרמטרים לאלגוריתם הגנטי
export interface GeneticAlgorithmParams {
  populationSize: number;     // גודל האוכלוסייה
  generations: number;        // מספר הדורות להרצה
  mutationRate: number;       // קצב מוטציה
  crossoverRate: number;      // קצב הצלבה
  eliteCount: number;         // מספר האליטות לשמור בכל דור
}

// תוצאות סימולציה
export interface SimulationResult {
  chromosome: Chromosome;     // הכרומוזום שנבדק
  totalProfit: number;        // רווח כולל
  winRate: number;            // שיעור הצלחה
  tradeCount: number;         // מספר עסקאות
  maxDrawdown: number;        // ירידה מקסימלית
  sharpeRatio: number;        // יחס שארפ
}

/**
 * מחלקת האלגוריתם הגנטי לאופטימיזציה של אסטרטגיות
 */
export class GeneticAlgorithm {
  private population: Chromosome[] = [];
  private bestChromosomes: Chromosome[] = [];
  private params: GeneticAlgorithmParams;
  private dataFilePath: string;
  private marketConditions: { [key in MarketState]?: Candle[] } = {}; // דגימות קנדלים למצבי שוק שונים
  
  constructor(
    params: Partial<GeneticAlgorithmParams> = {},
    dataDirectory: string = 'data'
  ) {
    // הגדרת פרמטרים ברירת מחדל
    this.params = {
      populationSize: params.populationSize || 50,
      generations: params.generations || 30,
      mutationRate: params.mutationRate || 0.1,
      crossoverRate: params.crossoverRate || 0.7,
      eliteCount: params.eliteCount || 5
    };
    
    // וודא שתיקיית הנתונים קיימת
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true });
    }
    
    this.dataFilePath = path.join(dataDirectory, 'genetic_data.json');
    
    // נסה לטעון נתונים קיימים
    this.loadData();
  }
  
  /**
   * טעינת נתוני אלגוריתם גנטי קיימים
   */
  private loadData(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.dataFilePath, 'utf8'));
        this.population = data.population || [];
        this.bestChromosomes = data.bestChromosomes || [];
        this.marketConditions = data.marketConditions || {};
        
        console.log(`Loaded genetic data with ${this.population.length} chromosomes and ${this.bestChromosomes.length} best chromosomes`);
      }
    } catch (error) {
      console.error(`Error loading genetic data: ${error}`);
      // אתחול נתונים חדשים במקרה של שגיאה
      this.population = [];
      this.bestChromosomes = [];
      this.marketConditions = {};
    }
  }
  
  /**
   * שמירת נתוני אלגוריתם גנטי לקובץ
   */
  private saveData(): void {
    try {
      const data = {
        population: this.population,
        bestChromosomes: this.bestChromosomes,
        marketConditions: this.marketConditions,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
      console.log(`Saved genetic data with ${this.population.length} chromosomes and ${this.bestChromosomes.length} best chromosomes`);
    } catch (error) {
      console.error(`Error saving genetic data: ${error}`);
    }
  }
  
  /**
   * אתחול אוכלוסייה התחלתית של כרומוזומים
   * 
   * @param strategyType סוג האסטרטגיה לאתחול
   * @param marketState מצב השוק
   * @param currentPrice מחיר השוק הנוכחי
   */
  public initializePopulation(strategyType: StrategyType, marketState: MarketState, currentPrice: number): void {
    this.population = [];
    
    for (let i = 0; i < this.params.populationSize; i++) {
      // יצירת כרומוזום חדש
      const chromosome = this.createRandomChromosome(strategyType, marketState, currentPrice);
      this.population.push(chromosome);
    }
    
    console.log(`Initialized population with ${this.population.length} chromosomes for ${strategyType} strategy`);
  }
  
  /**
   * יצירת כרומוזום אקראי
   * 
   * @param strategyType סוג האסטרטגיה
   * @param marketState מצב השוק
   * @param currentPrice מחיר השוק הנוכחי
   * @returns כרומוזום חדש
   */
  private createRandomChromosome(strategyType: StrategyType, marketState: MarketState, currentPrice: number): Chromosome {
    // יצירת פרמטרים אקראיים בהתאם לסוג האסטרטגיה
    let params: StrategyParams;
    
    switch (strategyType) {
      case StrategyType.GRID_NARROW:
      case StrategyType.GRID_MEDIUM:
      case StrategyType.GRID_WIDE:
        // אסטרטגיית גריד - פרמטרים אקראיים בהתאם למצב השוק
        const volatilityFactor = this.getVolatilityFactorForMarketState(marketState);
        const lowerPricePct = this.getRandomInRange(0.02, 0.05) * volatilityFactor;
        const upperPricePct = this.getRandomInRange(0.02, 0.05) * volatilityFactor;
        
        const gridParams: GridParams = {
          lowerPrice: currentPrice * (1 - lowerPricePct),
          upperPrice: currentPrice * (1 + upperPricePct),
          gridCount: Math.floor(this.getRandomInRange(5, 15)),
          investmentPerGrid: this.getRandomInRange(50, 200)
        };
        
        params = {
          gridParams,
          stopLossPercent: this.getRandomInRange(1, 5),
          takeProfitPercent: this.getRandomInRange(3, 10)
        };
        break;
        
      case StrategyType.TREND_FOLLOWING:
        params = {
          trendStrengthThreshold: this.getRandomInRange(0.5, 0.8),
          stopLossPercent: this.getRandomInRange(3, 8),
          takeProfitPercent: this.getRandomInRange(6, 15)
        };
        break;
        
      case StrategyType.COUNTER_TREND:
        params = {
          trendStrengthThreshold: this.getRandomInRange(0.6, 0.9),
          stopLossPercent: this.getRandomInRange(2, 5),
          takeProfitPercent: this.getRandomInRange(3, 8)
        };
        break;
        
      case StrategyType.BREAKOUT:
        params = {
          breakoutVolumeMultiplier: this.getRandomInRange(1.5, 3.5),
          stopLossPercent: this.getRandomInRange(3, 7),
          takeProfitPercent: this.getRandomInRange(8, 15)
        };
        break;
        
      default:
        // ברירת מחדל - גריד בינוני
        params = {
          gridParams: {
            lowerPrice: currentPrice * 0.9,
            upperPrice: currentPrice * 1.1,
            gridCount: 10,
            investmentPerGrid: 100
          },
          stopLossPercent: 3,
          takeProfitPercent: 6
        };
    }
    
    // יצירת הכרומוזום
    return {
      id: this.generateId(),
      strategyType,
      params,
      fitness: 0,
      generation: 1,
      trades: [],
      created: Date.now()
    };
  }
  
  /**
   * חישוב פקטור תנודתיות בהתאם למצב שוק
   * 
   * @param marketState מצב השוק
   * @returns פקטור תנודתיות
   */
  private getVolatilityFactorForMarketState(marketState: MarketState): number {
    switch (marketState) {
      case MarketState.STRONG_UPTREND:
      case MarketState.STRONG_DOWNTREND:
        return 2.0;
      case MarketState.UPTREND:
      case MarketState.DOWNTREND:
        return 1.5;
      case MarketState.VOLATILE:
        return 2.5;
      case MarketState.BREAKING_OUT:
      case MarketState.BREAKING_DOWN:
        return 2.2;
      case MarketState.SIDEWAYS:
        return 1.0;
      default:
        return 1.2;
    }
  }
  
  /**
   * קבלת מספר אקראי בטווח
   * 
   * @param min הערך המינימלי
   * @param max הערך המקסימלי
   * @returns מספר אקראי בטווח
   */
  private getRandomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * יצירת מזהה ייחודי
   * 
   * @returns מזהה ייחודי
   */
  private generateId(): string {
    return `chr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  
  /**
   * הרצת אבולוציה על האוכלוסייה
   * 
   * @param candlesData נתוני נרות להרצת הסימולציה
   * @param generations מספר הדורות להרצה
   * @returns הכרומוזום הטוב ביותר שנמצא
   */
  public async evolve(candlesData: Candle[], generations: number = this.params.generations): Promise<Chromosome> {
    if (this.population.length === 0) {
      throw new Error('Population not initialized. Call initializePopulation first.');
    }
    
    let currentGeneration = 1;
    let bestChromosome: Chromosome | null = null;
    
    while (currentGeneration <= generations) {
      console.log(`Starting evolution generation ${currentGeneration}`);
      
      // הערכת הכושר של כל כרומוזום
      await this.evaluatePopulation(candlesData);
      
      // מיון האוכלוסייה לפי כושר
      this.population.sort((a, b) => b.fitness - a.fitness);
      
      // שמירת הכרומוזום הטוב ביותר
      const currentBest = this.population[0];
      if (!bestChromosome || currentBest.fitness > bestChromosome.fitness) {
        bestChromosome = { ...currentBest };
        console.log(`New best chromosome found in generation ${currentGeneration} with fitness ${bestChromosome.fitness}`);
      }
      
      // שמירת הכרומוזומים הטובים ביותר
      this.bestChromosomes.push({ ...currentBest });
      
      // הגבלת מספר הכרומוזומים הטובים ביותר
      if (this.bestChromosomes.length > 100) {
        this.bestChromosomes = this.bestChromosomes
          .sort((a, b) => b.fitness - a.fitness)
          .slice(0, 100);
      }
      
      // אם זה הדור האחרון, נסיים
      if (currentGeneration === generations) {
        break;
      }
      
      // יצירת דור חדש
      const newPopulation: Chromosome[] = [];
      
      // אליטיזם - העתקת הכרומוזומים הטובים ביותר
      for (let i = 0; i < this.params.eliteCount && i < this.population.length; i++) {
        newPopulation.push({ ...this.population[i], generation: currentGeneration + 1 });
      }
      
      // מילוי שאר האוכלוסייה
      while (newPopulation.length < this.params.populationSize) {
        // בחירת הורים
        const parent1 = this.selectParent();
        const parent2 = this.selectParent();
        
        // הצלבה אם האקראיות קטנה מקצב ההצלבה
        if (Math.random() < this.params.crossoverRate) {
          const [child1, child2] = this.crossover(parent1, parent2, currentGeneration + 1);
          
          // מוטציה
          if (Math.random() < this.params.mutationRate) {
            this.mutate(child1);
          }
          if (Math.random() < this.params.mutationRate) {
            this.mutate(child2);
          }
          
          newPopulation.push(child1);
          if (newPopulation.length < this.params.populationSize) {
            newPopulation.push(child2);
          }
        } else {
          // העתקה ישירה עם אפשרות למוטציה
          const child1 = { ...parent1, id: this.generateId(), generation: currentGeneration + 1 };
          const child2 = { ...parent2, id: this.generateId(), generation: currentGeneration + 1 };
          
          if (Math.random() < this.params.mutationRate) {
            this.mutate(child1);
          }
          if (Math.random() < this.params.mutationRate) {
            this.mutate(child2);
          }
          
          newPopulation.push(child1);
          if (newPopulation.length < this.params.populationSize) {
            newPopulation.push(child2);
          }
        }
      }
      
      // החלפת האוכלוסייה הנוכחית בדור החדש
      this.population = newPopulation;
      
      // שמירת נתונים כל 5 דורות
      if (currentGeneration % 5 === 0) {
        this.saveData();
      }
      
      currentGeneration++;
    }
    
    // שמירת הנתונים בסיום האבולוציה
    this.saveData();
    
    // החזרת הכרומוזום הטוב ביותר
    return bestChromosome as Chromosome;
  }
  
  /**
   * הערכת כושר לכל האוכלוסייה
   * 
   * @param candlesData נתוני נרות להרצת הסימולציה
   */
  private async evaluatePopulation(candlesData: Candle[]): Promise<void> {
    const promises = this.population.map(chromosome => this.evaluateFitness(chromosome, candlesData));
    await Promise.all(promises);
  }
  
  /**
   * הערכת כושר לכרומוזום בודד
   * 
   * @param chromosome הכרומוזום להערכה
   * @param candlesData נתוני נרות להרצת הסימולציה
   */
  private async evaluateFitness(chromosome: Chromosome, candlesData: Candle[]): Promise<void> {
    // סימולציית מסחר
    const result = this.simulateTrades(chromosome, candlesData);
    
    // חישוב ציון כושר מורכב המשקלל מספר מדדים
    let fitness = 0;
    
    // רווח כולל - המשקל הכבד ביותר
    fitness += result.totalProfit * 10;
    
    // שיעור הצלחה - חשוב לעקביות
    fitness += result.winRate * 30;
    
    // מספר עסקאות - מעדיפים אסטרטגיות שפעילות יותר (עד גבול מסוים)
    const tradeCountScore = Math.min(result.tradeCount, 30) / 30 * 10;
    fitness += tradeCountScore;
    
    // ירידה מקסימלית - עונש על ירידות חדות
    const drawdownPenalty = Math.min(Math.abs(result.maxDrawdown), 30) / 30 * 20;
    fitness -= drawdownPenalty;
    
    // יחס שארפ - חשוב ליחס סיכון/סיכוי
    fitness += Math.max(0, result.sharpeRatio) * 5;
    
    // עדכון הכרומוזום
    chromosome.fitness = fitness;
    chromosome.trades = result.trades;
  }
  
  /**
   * סימולציית מסחר לכרומוזום
   * 
   * @param chromosome הכרומוזום לסימולציה
   * @param candlesData נתוני נרות להרצת הסימולציה
   * @returns תוצאות הסימולציה
   */
  private simulateTrades(chromosome: Chromosome, candlesData: Candle[]): {
    totalProfit: number;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: ChromosomeTrade[];
  } {
    const { strategyType, params } = chromosome;
    const trades: ChromosomeTrade[] = [];
    let position: 'BUY' | 'SELL' | null = null;
    let entryPrice = 0;
    let entryAmount = 0;
    let totalProfit = 0;
    let balance = 1000; // יתרה התחלתית לסימולציה
    let maxBalance = balance;
    let minBalance = balance;
    let profitTrades = 0;
    let lossTrades = 0;
    const dailyReturns: number[] = [];
    let previousDayBalance = balance;
    let previousDayTimestamp = 0;
    
    // סימולציה עבור כל נר
    for (let i = 20; i < candlesData.length; i++) {  // מתחילים מ-20 כדי שיהיו מספיק נתונים היסטוריים
      const candle = candlesData[i];
      const previousCandles = candlesData.slice(0, i);
      
      // בדיקת יום חדש לחישוב תשואה יומית
      const candleDate = new Date(candle.timestamp);
      const candleDay = candleDate.getUTCDate();
      const previousDate = new Date(previousDayTimestamp);
      const previousDay = previousDate.getUTCDate();
      
      if (previousDayTimestamp && candleDay !== previousDay) {
        // יום חדש - חישוב תשואה יומית
        const dailyReturn = (balance - previousDayBalance) / previousDayBalance;
        dailyReturns.push(dailyReturn);
        previousDayBalance = balance;
      }
      previousDayTimestamp = candle.timestamp;
      
      // הפעלת אסטרטגיה שונה בהתאם לסוג האסטרטגיה
      let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      
      switch (strategyType) {
        case StrategyType.GRID_NARROW:
        case StrategyType.GRID_MEDIUM:
        case StrategyType.GRID_WIDE:
          signal = this.executeGridStrategy(candle, previousCandles, params);
          break;
        case StrategyType.TREND_FOLLOWING:
          signal = this.executeTrendFollowingStrategy(candle, previousCandles, params);
          break;
        case StrategyType.COUNTER_TREND:
          signal = this.executeCounterTrendStrategy(candle, previousCandles, params);
          break;
        case StrategyType.BREAKOUT:
          signal = this.executeBreakoutStrategy(candle, previousCandles, params);
          break;
      }
      
      // ביצוע פעולה בהתאם לאות ולמצב הנוכחי
      if (signal === 'BUY' && position !== 'BUY') {
        if (position === 'SELL') {
          // סגירת פוזיציית מכירה
          const profit = entryAmount * (entryPrice - candle.close);
          totalProfit += profit;
          
          const trade: ChromosomeTrade = {
            action: 'SELL',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          };
          trades.push(trade);
          
          if (profit > 0) profitTrades++;
          else lossTrades++;
          
          // עדכון יתרה
          balance += profit;
          maxBalance = Math.max(maxBalance, balance);
          minBalance = Math.min(minBalance, balance);
        }
        
        // פתיחת פוזיציית קנייה
        position = 'BUY';
        entryPrice = candle.close;
        entryAmount = 0.1; // כמות לדוגמה - במציאות תלוי בגודל הפוזיציה הרצוי
        
        trades.push({
          action: 'BUY',
          price: entryPrice,
          amount: entryAmount,
          timestamp: candle.timestamp
        });
      }
      else if (signal === 'SELL' && position !== 'SELL') {
        if (position === 'BUY') {
          // סגירת פוזיציית קנייה
          const profit = entryAmount * (candle.close - entryPrice);
          totalProfit += profit;
          
          const trade: ChromosomeTrade = {
            action: 'BUY',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          };
          trades.push(trade);
          
          if (profit > 0) profitTrades++;
          else lossTrades++;
          
          // עדכון יתרה
          balance += profit;
          maxBalance = Math.max(maxBalance, balance);
          minBalance = Math.min(minBalance, balance);
        }
        
        // פתיחת פוזיציית מכירה
        position = 'SELL';
        entryPrice = candle.close;
        entryAmount = 0.1; // כמות לדוגמה
        
        trades.push({
          action: 'SELL',
          price: entryPrice,
          amount: entryAmount,
          timestamp: candle.timestamp
        });
      }
      
      // בדיקת stop loss ו-take profit
      if (position === 'BUY') {
        const currentProfit = entryAmount * (candle.close - entryPrice) / entryPrice * 100;
        
        if (params.stopLossPercent && currentProfit < -params.stopLossPercent) {
          // הפעלת stop loss
          const profit = entryAmount * (candle.close - entryPrice);
          totalProfit += profit;
          
          trades.push({
            action: 'BUY',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          });
          
          lossTrades++;
          position = null;
          
          // עדכון יתרה
          balance += profit;
          minBalance = Math.min(minBalance, balance);
        }
        else if (params.takeProfitPercent && currentProfit > params.takeProfitPercent) {
          // הפעלת take profit
          const profit = entryAmount * (candle.close - entryPrice);
          totalProfit += profit;
          
          trades.push({
            action: 'BUY',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          });
          
          profitTrades++;
          position = null;
          
          // עדכון יתרה
          balance += profit;
          maxBalance = Math.max(maxBalance, balance);
        }
      }
      else if (position === 'SELL') {
        const currentProfit = entryAmount * (entryPrice - candle.close) / entryPrice * 100;
        
        if (params.stopLossPercent && currentProfit < -params.stopLossPercent) {
          // הפעלת stop loss
          const profit = entryAmount * (entryPrice - candle.close);
          totalProfit += profit;
          
          trades.push({
            action: 'SELL',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          });
          
          lossTrades++;
          position = null;
          
          // עדכון יתרה
          balance += profit;
          minBalance = Math.min(minBalance, balance);
        }
        else if (params.takeProfitPercent && currentProfit > params.takeProfitPercent) {
          // הפעלת take profit
          const profit = entryAmount * (entryPrice - candle.close);
          totalProfit += profit;
          
          trades.push({
            action: 'SELL',
            price: candle.close,
            amount: entryAmount,
            timestamp: candle.timestamp,
            profit
          });
          
          profitTrades++;
          position = null;
          
          // עדכון יתרה
          balance += profit;
          maxBalance = Math.max(maxBalance, balance);
        }
      }
    }
    
    // בדיקה אם נשארה פוזיציה פתוחה בסוף הסימולציה
    if (position) {
      const lastCandle = candlesData[candlesData.length - 1];
      let profit = 0;
      
      if (position === 'BUY') {
        profit = entryAmount * (lastCandle.close - entryPrice);
      } else {
        profit = entryAmount * (entryPrice - lastCandle.close);
      }
      
      totalProfit += profit;
      
      trades.push({
        action: position,
        price: lastCandle.close,
        amount: entryAmount,
        timestamp: lastCandle.timestamp,
        profit
      });
      
      if (profit > 0) profitTrades++;
      else lossTrades++;
      
      balance += profit;
    }
    
    // חישוב מדדים סופיים
    const tradeCount = profitTrades + lossTrades;
    const winRate = tradeCount > 0 ? profitTrades / tradeCount : 0;
    const maxDrawdown = (maxBalance - minBalance) / maxBalance;
    
    // חישוב יחס שארפ
    let sharpeRatio = 0;
    if (dailyReturns.length > 0) {
      const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
      const stdDev = Math.sqrt(
        dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length
      );
      sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;
    }
    
    return {
      totalProfit,
      winRate,
      tradeCount,
      maxDrawdown,
      sharpeRatio,
      trades
    };
  }
  
  /**
   * הפעלת אסטרטגיית גריד
   * 
   * @param candle הנר הנוכחי
   * @param previousCandles נרות היסטוריים
   * @param params פרמטרי האסטרטגיה
   * @returns אות מסחר
   */
  private executeGridStrategy(
    candle: Candle,
    previousCandles: Candle[],
    params: StrategyParams
  ): 'BUY' | 'SELL' | 'HOLD' {
    if (!params.gridParams) {
      return 'HOLD';
    }
    
    const { lowerPrice, upperPrice, gridCount } = params.gridParams;
    const price = candle.close;
    
    if (price <= lowerPrice) {
      return 'BUY';  // קנייה כשהמחיר מגיע לגבול התחתון
    } else if (price >= upperPrice) {
      return 'SELL';  // מכירה כשהמחיר מגיע לגבול העליון
    }
    
    // חישוב מרווח הרשת
    const gridSpacing = (upperPrice - lowerPrice) / gridCount;
    
    // בדיקה באיזה קו רשת נמצא המחיר
    const gridPosition = Math.floor((price - lowerPrice) / gridSpacing);
    
    // בדיקה מהו המחיר של קו הרשת הקרוב ביותר
    const nearestGridLine = lowerPrice + gridPosition * gridSpacing;
    const nextGridLine = nearestGridLine + gridSpacing;
    
    // בדיקה האם המחיר חצה קו רשת מאז הנר הקודם
    const previousCandle = previousCandles[previousCandles.length - 1];
    
    if (previousCandle.close < nearestGridLine && price >= nearestGridLine) {
      return 'SELL';  // חציית קו רשת מלמטה למעלה - מכירה
    } else if (previousCandle.close > nextGridLine && price <= nextGridLine) {
      return 'BUY';   // חציית קו רשת מלמעלה למטה - קנייה
    }
    
    return 'HOLD';
  }
  
  /**
   * הפעלת אסטרטגיית מעקב אחר מגמה
   * 
   * @param candle הנר הנוכחי
   * @param previousCandles נרות היסטוריים
   * @param params פרמטרי האסטרטגיה
   * @returns אות מסחר
   */
  private executeTrendFollowingStrategy(
    candle: Candle,
    previousCandles: Candle[],
    params: StrategyParams
  ): 'BUY' | 'SELL' | 'HOLD' {
    // חישוב ממוצעים נעים
    const prices = previousCandles.map(c => c.close).concat(candle.close);
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    
    // אות מגמה עולה - ממוצע קצר מעל ממוצע ארוך
    if (sma20[sma20.length - 1] > sma50[sma50.length - 1] &&
        sma20[sma20.length - 2] <= sma50[sma50.length - 2]) {
      return 'BUY';
    }
    
    // אות מגמה יורדת - ממוצע קצר מתחת לממוצע ארוך
    if (sma20[sma20.length - 1] < sma50[sma50.length - 1] &&
        sma20[sma20.length - 2] >= sma50[sma50.length - 2]) {
      return 'SELL';
    }
    
    return 'HOLD';
  }
  
  /**
   * הפעלת אסטרטגיית חציית מגמה
   * 
   * @param candle הנר הנוכחי
   * @param previousCandles נרות היסטוריים
   * @param params פרמטרי האסטרטגיה
   * @returns אות מסחר
   */
  private executeCounterTrendStrategy(
    candle: Candle,
    previousCandles: Candle[],
    params: StrategyParams
  ): 'BUY' | 'SELL' | 'HOLD' {
    // חישוב RSI
    const prices = previousCandles.map(c => c.close).concat(candle.close);
    const rsi = this.calculateRSI(prices, 14);
    const currentRSI = rsi[rsi.length - 1];
    
    // אותות מסחר לפי RSI
    if (currentRSI < 30) {
      return 'BUY';  // RSI נמוך - תנאי קנייה אפשרי
    } else if (currentRSI > 70) {
      return 'SELL';  // RSI גבוה - תנאי מכירה אפשרי
    }
    
    return 'HOLD';
  }
  
  /**
   * הפעלת אסטרטגיית פריצה
   * 
   * @param candle הנר הנוכחי
   * @param previousCandles נרות היסטוריים
   * @param params פרמטרי האסטרטגיה
   * @returns אות מסחר
   */
  private executeBreakoutStrategy(
    candle: Candle,
    previousCandles: Candle[],
    params: StrategyParams
  ): 'BUY' | 'SELL' | 'HOLD' {
    // חישוב ערוצי מחיר
    const highPrices = previousCandles.slice(-20).map(c => c.high);
    const lowPrices = previousCandles.slice(-20).map(c => c.low);
    
    const resistance = Math.max(...highPrices);
    const support = Math.min(...lowPrices);
    
    // חישוב נפח ממוצע
    const avgVolume = previousCandles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const volumeMultiplier = params.breakoutVolumeMultiplier || 1.5;
    
    // בדיקת פריצה למעלה
    if (candle.close > resistance && candle.volume > avgVolume * volumeMultiplier) {
      return 'BUY';
    }
    
    // בדיקת פריצה למטה
    if (candle.close < support && candle.volume > avgVolume * volumeMultiplier) {
      return 'SELL';
    }
    
    return 'HOLD';
  }
  
  /**
   * חישוב ממוצע נע פשוט (SMA)
   * 
   * @param prices מערך של מחירים
   * @param period תקופת הממוצע הנע
   * @returns מערך של ערכי ממוצע נע
   */
  private calculateSMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += prices[j];
        }
        result.push(sum / period);
      }
    }
    
    return result;
  }
  
  /**
   * חישוב אינדיקטור RSI (Relative Strength Index)
   * 
   * @param prices מערך של מחירים
   * @param period תקופת ה-RSI (בדרך כלל 14)
   * @returns מערך של ערכי RSI
   */
  private calculateRSI(prices: number[], period: number = 14): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    // חישוב שינויים במחיר
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    // אין מספיק נתונים
    if (gains.length < period) {
      return Array(prices.length).fill(NaN);
    }
    
    // חישוב ממוצע ראשוני של רווחים והפסדים
    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    // הערך הראשון של RSI
    result.push(NaN); // אין RSI לנקודת המחיר הראשונה
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
    
    // חישוב RSI לשאר הנקודות
    for (let i = period; i < gains.length; i++) {
      // חישוב ממוצע נע של רווחים והפסדים
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    
    // השלם את המערך אם יש ערכים חסרים
    while (result.length < prices.length) {
      result.unshift(NaN);
    }
    
    return result;
  }
  
  /**
   * בחירת כרומוזום הורה בשיטת גלגל רולטה
   * 
   * @returns כרומוזום נבחר
   */
  private selectParent(): Chromosome {
    // חישוב סכום הכושר הכולל
    const totalFitness = this.population.reduce((sum, chromosome) => sum + Math.max(0.1, chromosome.fitness), 0);
    
    // בחירה אקראית על גלגל הרולטה
    let randomFitness = Math.random() * totalFitness;
    let runningSum = 0;
    
    for (const chromosome of this.population) {
      runningSum += Math.max(0.1, chromosome.fitness);
      if (runningSum >= randomFitness) {
        return chromosome;
      }
    }
    
    // במקרה שלא נבחר אף כרומוזום (למקרה קצה)
    return this.population[0];
  }
  
  /**
   * הצלבת שני כרומוזומים ליצירת צאצאים
   * 
   * @param parent1 כרומוזום הורה 1
   * @param parent2 כרומוזום הורה 2
   * @param generation מספר הדור של הצאצאים
   * @returns מערך של שני כרומוזומים צאצאים
   */
  private crossover(parent1: Chromosome, parent2: Chromosome, generation: number): [Chromosome, Chromosome] {
    // יצירת שני צאצאים חדשים
    const child1: Chromosome = {
      id: this.generateId(),
      strategyType: parent1.strategyType,
      params: { ...parent1.params },
      fitness: 0,
      generation,
      trades: [],
      created: Date.now()
    };
    
    const child2: Chromosome = {
      id: this.generateId(),
      strategyType: parent2.strategyType,
      params: { ...parent2.params },
      fitness: 0,
      generation,
      trades: [],
      created: Date.now()
    };
    
    // הצלבת פרמטרים
    if (parent1.strategyType === parent2.strategyType) {
      this.crossoverParams(parent1.params, parent2.params, child1.params, child2.params);
    }
    
    return [child1, child2];
  }
  
  /**
   * הצלבת פרמטרים בין הורים
   * 
   * @param params1 פרמטרים של הורה 1
   * @param params2 פרמטרים של הורה 2
   * @param childParams1 פרמטרים של צאצא 1
   * @param childParams2 פרמטרים של צאצא 2
   */
  private crossoverParams(
    params1: StrategyParams,
    params2: StrategyParams,
    childParams1: StrategyParams,
    childParams2: StrategyParams
  ): void {
    // הצלבת פרמטרים לפי סוג
    if (params1.gridParams && params2.gridParams) {
      // הצלבת פרמטרים של אסטרטגיית גריד
      childParams1.gridParams = { ...params1.gridParams };
      childParams2.gridParams = { ...params2.gridParams };
      
      // הצלבת מחירי הגריד
      const ratio = Math.random();
      childParams1.gridParams.upperPrice = params1.gridParams.upperPrice * ratio + params2.gridParams.upperPrice * (1 - ratio);
      childParams1.gridParams.lowerPrice = params1.gridParams.lowerPrice * ratio + params2.gridParams.lowerPrice * (1 - ratio);
      
      childParams2.gridParams.upperPrice = params2.gridParams.upperPrice * ratio + params1.gridParams.upperPrice * (1 - ratio);
      childParams2.gridParams.lowerPrice = params2.gridParams.lowerPrice * ratio + params1.gridParams.lowerPrice * (1 - ratio);
      
      // החלפת מספר הקווים
      childParams1.gridParams.gridCount = params2.gridParams.gridCount;
      childParams2.gridParams.gridCount = params1.gridParams.gridCount;
    }
    
    // הצלבת ספי stop loss ו-take profit
    if (params1.stopLossPercent !== undefined && params2.stopLossPercent !== undefined) {
      childParams1.stopLossPercent = params2.stopLossPercent;
      childParams2.stopLossPercent = params1.stopLossPercent;
    }
    
    if (params1.takeProfitPercent !== undefined && params2.takeProfitPercent !== undefined) {
      childParams1.takeProfitPercent = params2.takeProfitPercent;
      childParams2.takeProfitPercent = params1.takeProfitPercent;
    }
    
    // הצלבת פרמטרים נוספים
    if (params1.trendStrengthThreshold !== undefined && params2.trendStrengthThreshold !== undefined) {
      const ratio = Math.random();
      childParams1.trendStrengthThreshold = params1.trendStrengthThreshold * ratio + params2.trendStrengthThreshold * (1 - ratio);
      childParams2.trendStrengthThreshold = params2.trendStrengthThreshold * ratio + params1.trendStrengthThreshold * (1 - ratio);
    }
    
    if (params1.breakoutVolumeMultiplier !== undefined && params2.breakoutVolumeMultiplier !== undefined) {
      const ratio = Math.random();
      childParams1.breakoutVolumeMultiplier = params1.breakoutVolumeMultiplier * ratio + params2.breakoutVolumeMultiplier * (1 - ratio);
      childParams2.breakoutVolumeMultiplier = params2.breakoutVolumeMultiplier * ratio + params1.breakoutVolumeMultiplier * (1 - ratio);
    }
  }
  
  /**
   * מוטציה של כרומוזום
   * 
   * @param chromosome הכרומוזום לבצע בו מוטציה
   */
  private mutate(chromosome: Chromosome): void {
    const { params, strategyType } = chromosome;
    
    // שינויים קטנים באחוזי stop loss ו-take profit
    if (params.stopLossPercent !== undefined) {
      params.stopLossPercent *= (1 + (Math.random() * 0.4 - 0.2));  // שינוי של ±20%
      params.stopLossPercent = Math.max(0.5, Math.min(20, params.stopLossPercent));  // הגבלת הטווח
    }
    
    if (params.takeProfitPercent !== undefined) {
      params.takeProfitPercent *= (1 + (Math.random() * 0.4 - 0.2));  // שינוי של ±20%
      params.takeProfitPercent = Math.max(1, Math.min(50, params.takeProfitPercent));  // הגבלת הטווח
    }
    
    // מוטציה בפרמטרים של אסטרטגיית גריד
    if (params.gridParams) {
      // שינוי במחירי הגריד
      params.gridParams.upperPrice *= (1 + (Math.random() * 0.1 - 0.05));  // שינוי של ±5%
      params.gridParams.lowerPrice *= (1 + (Math.random() * 0.1 - 0.05));  // שינוי של ±5%
      
      // וידוא שהגבול העליון גדול מהגבול התחתון
      if (params.gridParams.upperPrice <= params.gridParams.lowerPrice) {
        params.gridParams.upperPrice = params.gridParams.lowerPrice * 1.05;
      }
      
      // שינוי במספר קווי הרשת
      if (Math.random() < 0.3) {
        params.gridParams.gridCount += Math.random() < 0.5 ? 1 : -1;
        params.gridParams.gridCount = Math.max(3, Math.min(20, params.gridParams.gridCount));
      }
      
      // שינוי בהשקעה לכל קו רשת
      params.gridParams.investmentPerGrid *= (1 + (Math.random() * 0.2 - 0.1));  // שינוי של ±10%
      params.gridParams.investmentPerGrid = Math.max(10, Math.min(300, params.gridParams.investmentPerGrid));
    }
    
    // מוטציה בפרמטרים של אסטרטגיית מעקב אחר מגמה
    if (strategyType === StrategyType.TREND_FOLLOWING && params.trendStrengthThreshold !== undefined) {
      params.trendStrengthThreshold *= (1 + (Math.random() * 0.2 - 0.1));  // שינוי של ±10%
      params.trendStrengthThreshold = Math.max(0.3, Math.min(0.9, params.trendStrengthThreshold));
    }
    
    // מוטציה בפרמטרים של אסטרטגיית פריצה
    if (strategyType === StrategyType.BREAKOUT && params.breakoutVolumeMultiplier !== undefined) {
      params.breakoutVolumeMultiplier *= (1 + (Math.random() * 0.4 - 0.2));  // שינוי של ±20%
      params.breakoutVolumeMultiplier = Math.max(1.2, Math.min(5, params.breakoutVolumeMultiplier));
    }
    
    // מוטציה למעבר לאסטרטגיה שונה
    if (Math.random() < 0.05) {  // 5% סיכוי לשנות אסטרטגיה
      const strategies = [
        StrategyType.GRID_NARROW,
        StrategyType.GRID_MEDIUM,
        StrategyType.GRID_WIDE,
        StrategyType.TREND_FOLLOWING,
        StrategyType.COUNTER_TREND,
        StrategyType.BREAKOUT
      ];
      
      // בחירת אסטרטגיה חדשה (שונה מהנוכחית)
      let newStrategyType;
      do {
        newStrategyType = strategies[Math.floor(Math.random() * strategies.length)];
      } while (newStrategyType === strategyType);
      
      chromosome.strategyType = newStrategyType;
      
      // יצירת פרמטרים מתאימים לאסטרטגיה החדשה
      // (נשמור על ספי stop loss ו-take profit קיימים)
      const stopLoss = params.stopLossPercent;
      const takeProfit = params.takeProfitPercent;
      
      switch (newStrategyType) {
        case StrategyType.GRID_NARROW:
        case StrategyType.GRID_MEDIUM:
        case StrategyType.GRID_WIDE:
          params.gridParams = {
            upperPrice: 100 * (1 + 0.05),
            lowerPrice: 100 * (1 - 0.05),
            gridCount: 10,
            investmentPerGrid: 100
          };
          delete params.trendStrengthThreshold;
          delete params.breakoutVolumeMultiplier;
          break;
          
        case StrategyType.TREND_FOLLOWING:
          delete params.gridParams;
          params.trendStrengthThreshold = 0.6;
          delete params.breakoutVolumeMultiplier;
          break;
          
        case StrategyType.COUNTER_TREND:
          delete params.gridParams;
          params.trendStrengthThreshold = 0.7;
          delete params.breakoutVolumeMultiplier;
          break;
          
        case StrategyType.BREAKOUT:
          delete params.gridParams;
          delete params.trendStrengthThreshold;
          params.breakoutVolumeMultiplier = 2.0;
          break;
      }
      
      // שחזור ספי stop loss ו-take profit
      params.stopLossPercent = stopLoss;
      params.takeProfitPercent = takeProfit;
    }
  }
  
  /**
   * קבלת הכרומוזום הטוב ביותר עבור מצב שוק נתון
   * 
   * @param marketState מצב השוק
   * @returns הכרומוזום הטוב ביותר או undefined אם אין
   */
  public getBestChromosomeForMarketState(marketState: MarketState): Chromosome | undefined {
    // איתור הכרומוזומים הטובים ביותר למצב השוק שמבוקש
    const relevantChromosomes = this.bestChromosomes.filter(chr => chr.fitness > 0);
    
    if (relevantChromosomes.length === 0) {
      return undefined;
    }
    
    // מיון לפי כושר
    relevantChromosomes.sort((a, b) => b.fitness - a.fitness);
    
    // החזרת הטוב ביותר
    return relevantChromosomes[0];
  }
  
  /**
   * הוספת מצב שוק וקנדלים לבסיס הנתונים
   * 
   * @param marketState מצב השוק
   * @param candles נתוני קנדלים
   */
  public addMarketCondition(marketState: MarketState, candles: Candle[]): void {
    this.marketConditions[marketState] = candles;
    this.saveData();
  }
  
  /**
   * קבלת נתוני הקנדלים עבור מצב שוק
   * 
   * @param marketState מצב השוק
   * @returns נתוני קנדלים או undefined אם אין
   */
  public getMarketConditionCandles(marketState: MarketState): Candle[] | undefined {
    return this.marketConditions[marketState];
  }
}

// יצירת מופע יחיד של המחלקה לשימוש בכל המערכת
export const geneticAlgorithm = new GeneticAlgorithm();