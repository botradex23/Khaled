import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GuidedTour, useGuidedTour } from "@/components/ui/guided-tour";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FeatureTooltip, PopoverHelpButton } from "@/components/ui/feature-tooltip";
import { cn } from "@/lib/utils";
import {
  Brain,
  TrendingUp,
  Bot,
  BarChart3,
  Shield,
  Globe,
  ChevronRight,
  Lock,
  AreaChart,
  LineChart,
  Github,
  PlayCircle,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  Lightbulb,
  BadgeCheck,
  HandCoins,
  ArrowUpRight,
  MousePointerClick,
  Info,
} from "lucide-react";
import { SiBinance } from "react-icons/si";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { showTour, setShowTour } = useGuidedTour();
  const [activeTab, setActiveTab] = useState("what-is");

  // Features section data
  const features = [
    {
      title: "מסחר מבוסס בינה מלאכותית",
      description:
        "אלגוריתמים מתקדמים מנתחים דפוסי שוק ומבצעים מסחר בזמנים אופטימליים.",
      icon: <Brain className="h-12 w-12 text-primary" />,
      tooltip: "המערכת משתמשת במודלים של למידת מכונה שנלמדו על מיליוני עסקאות היסטוריות"
    },
    {
      title: "נתוני שוק בזמן אמת",
      description:
        "גישה למידע עדכני מבורסות קריפטו מובילות עם עדכון מידי.",
      icon: <TrendingUp className="h-12 w-12 text-primary" />,
      tooltip: "מקבל נתונים ממקורות רבים כולל Binance ו-OKX עם זמן תגובה של מילישניות"
    },
    {
      title: "מסחר גריד אוטומטי",
      description:
        "הגדרת בוטים לרכישה במחיר נמוך ומכירה במחיר גבוה לאורך טווח מחירים.",
      icon: <Bot className="h-12 w-12 text-primary" />,
      tooltip: "טכניקת מסחר פופולרית שפועלת היטב בשווקים תנודתיים. המערכת מייצרת רשת קניות ומכירות אוטומטית"
    },
    {
      title: "ניתוח מתקדם",
      description:
        "מעקב אחר הביצועים שלך עם ניתוח מפורט ודוחות ויזואליים.",
      icon: <BarChart3 className="h-12 w-12 text-primary" />,
      tooltip: "הצגת דוחות מפורטים הכוללים ROI, סיכון מותאם, ביצועים לאורך זמן ועוד"
    },
    {
      title: "אבטחה מובנית",
      description:
        "מפתחות ה-API והנתונים שלך מוצפנים ולעולם לא משותפים עם צד שלישי.",
      icon: <Shield className="h-12 w-12 text-primary" />,
      tooltip: "אנו משתמשים בהצפנה ברמה צבאית ובפרוטוקולי אבטחה מתקדמים להגנה על המידע שלך"
    },
    {
      title: "תמיכה במספר בורסות",
      description:
        "התחברות לבורסות קריפטו פופולריות דרך אינטגרציות API מאובטחות.",
      icon: <Globe className="h-12 w-12 text-primary" />,
      tooltip: "המערכת תומכת ב-Binance, OKX ובקרוב גם בבורסות נוספות"
    },
  ];

  // Define bot types for the "Bot Types" tab
  const botTypes = [
    {
      name: "AI Grid Bot",
      description: "הבוט יוצר רשת של הוראות קנייה ומכירה לאורך טווח מחירים ומתאים את הרשת באופן אוטומטי לפי תנאי השוק המשתנים.",
      icon: <Bot className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "פועל היטב בשווקים תנודתיים",
        "קונה במחירים נמוכים, מוכר במחירים גבוהים",
        "ביצועים טובים בשווקים ללא כיוון ברור"
      ],
      path: "/ai-grid-bot"
    },
    {
      name: "DCA Bot",
      description: "בוט העלות הממוצעת בדולרים רוכש באופן קבוע כמויות מוגדרות מראש של מטבע בזמנים קבועים, ללא תלות במחיר השוק הנוכחי.",
      icon: <HandCoins className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "הורדת עלות רכישה ממוצעת לאורך זמן",
        "מקטין את השפעת התנודתיות לטווח ארוך",
        "אסטרטגיה פשוטה אך יעילה לטווח ארוך"
      ],
      path: "/dca-bot"
    },
    {
      name: "MACD Bot",
      description: "בוט המבוסס על אינדיקטור המתכנס-מתפצל של ממוצעים נעים (MACD) לזיהוי שינויי מגמה ומומנטום במחירי שוק.",
      icon: <LineChart className="h-10 w-10 text-primary mb-2" />,
      benefits: [
        "זיהוי מגמות וסימני היפוך",
        "חיפוש נקודות כניסה ויציאה אופטימליות",
        "אסטרטגיה טכנית מוכחת לכל סוגי השווקים"
      ],
      path: "/macd-bot"
    }
  ];

  // Quick tips for new users
  const quickTips = [
    {
      title: "התחל עם מסחר נייר",
      description: "נסה את האסטרטגיות השונות ללא סיכון כספי אמיתי בסביבת המסחר הווירטואלית שלנו.",
      icon: <MousePointerClick className="h-5 w-5 text-primary" />,
    },
    {
      title: "הגדר אזורי סיכון",
      description: "תמיד השתמש בהגדרות ניהול סיכונים כמו Stop Loss כדי להגביל הפסדים פוטנציאליים.",
      icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
    },
    {
      title: "בדוק את המדריכים",
      description: "לחץ על סמלי העזרה ועיין במדריכים השונים כדי להכיר את כל תכונות המערכת.",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
    },
  ];

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Guided Tour Dialog */}
      <GuidedTour open={showTour} onOpenChange={setShowTour} />
      
      {/* Header */}
      <header className="w-full py-4 px-6 bg-background/80 backdrop-blur-sm border-b border-border/40 fixed z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AreaChart className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">CryptoTrade AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setShowTour(true)}
              className="text-muted-foreground hover:text-foreground flex items-center"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">סיור מודרך</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="text-muted-foreground hover:text-foreground"
            >
              כניסה למערכת
            </Button>
            <Button onClick={() => navigate("/register")}>הרשמה</Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-background to-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex-1 space-y-6 mb-10 md:mb-0 md:pr-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
                מסחר קריפטו אוטומטי מבוסס AI
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                נצל את כוח הבינה המלאכותית כדי לסחור במטבעות קריפטו בדיוק וביעילות.
                הפלטפורמה שלנו מביאה אלגוריתמים ברמה מוסדית לסוחרים קמעונאיים.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/register")}
                  className="text-lg h-12"
                >
                  התחל עכשיו <ChevronRight className="ml-1 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/learn")}
                  className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                >
                  למד עוד על המערכת
                </Button>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="relative z-10 bg-background rounded-lg border border-border/60 shadow-xl overflow-hidden">
                <div className="p-4 bg-muted/30 border-b border-border/60 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="ml-2 text-sm text-muted-foreground">לוח בקרת בוט גריד AI</div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">BTC/USDT</div>
                      <div className="text-sm text-green-500">+2.34%</div>
                    </div>
                    <div className="h-48 w-full bg-muted/20 rounded-md overflow-hidden relative">
                      {/* Simulated chart */}
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M0,50 Q10,45 20,55 T40,45 T60,50 T80,35 T100,40"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                        />
                        <path
                          d="M0,50 Q10,45 20,55 T40,45 T60,50 T80,35 T100,40 V100 H0 Z"
                          fill="hsl(var(--primary)/0.1)"
                          stroke="none"
                        />
                      </svg>
                      {/* Grid lines */}
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="border-border/10 border-r last:border-r-0 border-b last:border-b-0"
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground">רווח כולל</div>
                        <div className="text-lg font-semibold text-green-500">$1,245.32</div>
                      </div>
                      <div className="bg-muted/30 p-3 rounded-md">
                        <div className="text-xs text-muted-foreground">בוטים פעילים</div>
                        <div className="text-lg font-semibold">3</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-4 -bottom-4 w-48 h-48 bg-primary/20 rounded-full filter blur-3xl -z-10" />
              <div className="absolute -right-8 -top-8 w-64 h-64 bg-primary/10 rounded-full filter blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-20 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              תכונות חזקות לסוחרי קריפטו
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              הפלטפורמה שלנו משלבת טכנולוגיית AI מתקדמת עם כלים ידידותיים למשתמש
              כדי לעזור לך למקסם את רווחי המסחר בקריפטו שלך.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureTooltip
                key={index}
                title={feature.title}
                description={feature.tooltip}
                position="top"
                icon={<Info className="h-3.5 w-3.5" />}
              >
                <div
                  className="p-6 border border-border rounded-lg bg-card transition-all hover:shadow-md hover:border-primary/20 cursor-help"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </FeatureTooltip>
            ))}
          </div>
        </div>
      </section>
      
      {/* Information Tabs Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              כל מה שצריך לדעת
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              מידע חשוב עבור משתמשים חדשים וותיקים כאחד
            </p>
          </div>
          
          <Tabs defaultValue="what-is" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="grid grid-cols-3 w-full max-w-xl">
                <TabsTrigger value="what-is" className="text-sm">מה זה בכלל?</TabsTrigger>
                <TabsTrigger value="bot-types" className="text-sm">סוגי בוטים</TabsTrigger>
                <TabsTrigger value="quick-tips" className="text-sm">טיפים מהירים</TabsTrigger>
              </TabsList>
            </div>
            
            <Card className="border-border/60">
              <TabsContent value="what-is" className="m-0">
                <CardHeader>
                  <CardTitle>כיצד המערכת עובדת?</CardTitle>
                  <CardDescription>
                    הסבר קצר על הטכנולוגיה והיתרונות שמאחורי המערכת
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/2 space-y-4">
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Brain className="w-5 h-5 mr-2 text-primary" />
                          בינה מלאכותית במסחר
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          המערכת מנתחת עשרות אלפי נקודות מידע בכל רגע נתון, כולל מחירים היסטוריים, נפחי מסחר,
                          סנטימנט שוק, וסמנים טכניים, כדי לזהות דפוסים ולנבא תנועות מחירים.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>דיוק של 76% בזיהוי מגמות משמעותיות</span>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Shield className="w-5 h-5 mr-2 text-primary" />
                          ניהול סיכונים חכם
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          הבוטים כוללים מנגנוני הגנה מובנים כגון הגדרות Stop Loss אוטומטיות,
                          פיזור השקעות, והגבלות סיכון מותאמות אישית לכל אסטרטגיה.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>צמצום תנודתיות תיק ההשקעות ב-35%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:w-1/2 space-y-4">
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <SiBinance className="w-5 h-5 mr-2 text-primary" />
                          חיבור לבורסות
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          המערכת מתחברת ישירות לחשבון הבורסה שלך (באמצעות API) ומבצעת פעולות באופן אוטומטי.
                          המפתחות נשמרים בצורה מאובטחת ולעולם אינם חשופים.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>תמיכה בבורסות המובילות</span>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 p-5 rounded-lg border border-border/60">
                        <h3 className="font-semibold text-lg mb-2 flex items-center">
                          <Bot className="w-5 h-5 mr-2 text-primary" />
                          בוטים אוטונומיים
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          הבוטים פועלים 24/7 ללא צורך בהתערבות אנושית. הם סורקים את השוק,
                          מזהים הזדמנויות, ומבצעים פעולות בהתאם לאסטרטגיה שהוגדרה מראש.
                        </p>
                        <div className="flex items-center text-sm text-primary">
                          <BadgeCheck className="h-4 w-4 mr-1.5" />
                          <span>פועלים ללא הפסקה גם כשאתה ישן</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button onClick={() => setActiveTab("bot-types")} className="flex items-center">
                      סוגי בוטים זמינים
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="bot-types" className="m-0">
                <CardHeader>
                  <CardTitle>סוגי בוטים במערכת</CardTitle>
                  <CardDescription>
                    הכר את הבוטים השונים ואת אסטרטגיות המסחר שלהם
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {botTypes.map((bot, index) => (
                      <Card key={index} className="bg-card/70 border-border/70">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            {bot.icon}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-primary h-6 px-2 py-1"
                              onClick={() => navigate(bot.path)}
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <CardTitle className="text-lg">{bot.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-4">
                            {bot.description}
                          </p>
                          <div className="space-y-2">
                            {bot.benefits.map((benefit, i) => (
                              <div key={i} className="flex items-center text-xs">
                                <BadgeCheck className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex justify-center pt-6">
                    <Button onClick={() => setActiveTab("quick-tips")} className="flex items-center">
                      טיפים מהירים
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
              
              <TabsContent value="quick-tips" className="m-0">
                <CardHeader>
                  <CardTitle>טיפים מהירים להתחלה</CardTitle>
                  <CardDescription>
                    עצות שימושיות למשתמשים חדשים במערכת
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                    {quickTips.map((tip, index) => (
                      <div 
                        key={index} 
                        className="flex p-4 bg-muted/40 rounded-lg border border-border/60"
                      >
                        <div className="mr-4 mt-1">
                          <div className="p-2 bg-background rounded-full">
                            {tip.icon}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium mb-1">{tip.title}</h3>
                          <p className="text-sm text-muted-foreground">{tip.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20 flex items-center">
                      <Info className="h-5 w-5 text-primary mr-4" />
                      <div>
                        <p className="text-sm">
                          כדי לקבל הסברים מפורטים יותר, <Link href="/learn" className="text-primary font-medium underline underline-offset-4">בקר בעמוד המדריכים</Link> או התחל <Button variant="link" className="h-auto p-0 text-primary underline underline-offset-4" onClick={() => setShowTour(true)}>סיור מודרך</Button>.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-8">
                    <Button onClick={() => setActiveTab("what-is")} className="flex items-center">
                      חזרה להסבר המערכת
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </section>

      {/* Learn About System Section */}
      <section className="py-20 px-6 bg-blue-900/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                חדש במערכת? למד כיצד היא עובדת
              </h2>
              <p className="text-xl text-muted-foreground mb-6">
                לפני שאתה צולל פנימה, גלה את המדריך המקיף שלנו כדי להבין כיצד מערכת המסחר
                שלנו יכולה לעזור למקסם את השקעות הקריפטו שלך.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/learn")}
                className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
              >
                גלה את תכונות המערכת
              </Button>
            </div>
            <div className="md:w-1/2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Bot className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">בוט גריד AI</h3>
                  <p className="text-sm text-muted-foreground">
                    מסחר אוטומטי לאורך טווחי מחירים המותאם על ידי בינה מלאכותית.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <TrendingUp className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">ניתוח שוק</h3>
                  <p className="text-sm text-muted-foreground">
                    נתונים בזמן אמת ממספר בורסות עם פילטרים מתקדמים.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Brain className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">אסטרטגיות חכמות</h3>
                  <p className="text-sm text-muted-foreground">
                    אסטרטגיות מסחר מוגדרות מראש המבוססות על תנאי שוק.
                  </p>
                </div>
                <div className="bg-white/10 p-4 rounded-lg border border-blue-200/20">
                  <Shield className="h-8 w-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold mb-1">ניהול סיכונים</h3>
                  <p className="text-sm text-muted-foreground">
                    הגנות מובנות עם הגדרות עצירת הפסד הניתנות להתאמה.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            מוכן לאוטומציה של המסחר בקריפטו?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            הצטרף לאלפי סוחרים המשתמשים בפלטפורמה שלנו כדי למטב את
            השקעות הקריפטו שלהם באמצעות אוטומציה מבוססת בינה מלאכותית.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              className="text-lg h-12"
            >
              צור חשבון חינם
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login")}
              className="text-lg h-12"
            >
              התחבר
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setShowTour(true)}
              className="text-lg h-12 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            >
              התחל סיור מודרך
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-muted/40 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <AreaChart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">CryptoTrade AI</span>
              </div>
              <p className="text-muted-foreground max-w-md mb-6">
                המשימה שלנו היא להנגיש אלגוריתמי מסחר מתוחכמים ולהפוך את המסחר
                מבוסס הבינה המלאכותית לזמין לכולם.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.01 10.01 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">GitHub</span>
                  <Github className="h-6 w-6" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">פלטפורמה</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    תכונות
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    תמחור
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={() => navigate("/learn")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    למידה
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    תיעוד API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">חברה</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    אודותינו
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    בלוג
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    דרושים
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary">
                    צור קשר
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} CryptoTrade AI. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}