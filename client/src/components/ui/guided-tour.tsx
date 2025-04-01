import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { X, ChevronLeft, ChevronRight, Info, CheckCircle2 } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  image?: string;
  highlightElement?: string;
}

interface GuidedTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function GuidedTour({ open, onOpenChange, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  // Tour steps configuration
  const tourSteps: TourStep[] = [
    {
      title: "ברוכים הבאים למערכת המסחר",
      description: "סיור קצר זה יציג לך את התכונות העיקריות של מערכת המסחר. בואו נתחיל!"
    },
    {
      title: "הדאשבורד הראשי",
      description: "דף הבית מציג לך סקירה כללית של השוק, הבוטים שלך והמטבעות שנמצאים במעקב.",
      highlightElement: "#dashboard-overview"
    },
    {
      title: "נתוני שוק בזמן אמת",
      description: "צפה במחירים עדכניים של מאות מטבעות קריפטו. ניתן לסנן, למיין ולחפש בקלות.",
      highlightElement: "#market-data"
    },
    {
      title: "הבוטים החכמים שלנו",
      description: "המערכת מציעה מספר בוטים מתקדמים כמו AI Grid, DCA ו-MACD. כל בוט מתמחה באסטרטגית מסחר שונה.",
      highlightElement: "#bots-section"
    },
    {
      title: "מסחר בסביבת נייר",
      description: "תרגל מסחר והפעלת בוטים ללא סיכון כספי באמצעות סביבת מסחר וירטואלית (Paper Trading).",
      highlightElement: "#paper-trading"
    },
    {
      title: "סיימנו!",
      description: "עכשיו אתה מוכן להתחיל. אל תשכח לעיין במדריכים המלאים בעמוד 'למידה' לקבלת מידע מפורט יותר."
    }
  ];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tour completed
      onOpenChange(false);
      if (onComplete) onComplete();
      
      toast({
        title: "סיור מודרך הושלם",
        description: "כעת תוכל להתחיל להשתמש במערכת. אנחנו מקווים שתיהנה!",
        variant: "default",
      });
      
      // Save to local storage that the tour has been completed
      localStorage.setItem('guidedTourCompleted', 'true');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    localStorage.setItem('guidedTourCompleted', 'true');
    
    toast({
      title: "סיור מודרך דולג",
      description: "תוכל לצפות בסיור שוב דרך תפריט העזרה.",
      variant: "default",
    });
  };

  // Effect to highlight elements if needed
  useEffect(() => {
    const currentStepData = tourSteps[currentStep];
    
    // Clear any previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    
    // Add highlight to the current element if specified
    if (currentStepData.highlightElement) {
      const elementToHighlight = document.querySelector(currentStepData.highlightElement);
      if (elementToHighlight) {
        elementToHighlight.classList.add('tour-highlight');
      }
    }
    
    return () => {
      // Clean up on unmount or step change
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, [currentStep, tourSteps]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              {currentStep === tourSteps.length - 1 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <Info className="h-5 w-5 text-primary mr-2" />
              )}
              {tourSteps[currentStep].title}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {tourSteps[currentStep].description}
          </DialogDescription>
        </DialogHeader>
        
        {tourSteps[currentStep].image && (
          <div className="p-4 flex justify-center">
            <img 
              src={tourSteps[currentStep].image} 
              alt={`Step ${currentStep + 1}`} 
              className="max-h-48 rounded-md border border-border"
            />
          </div>
        )}
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {currentStep > 0 ? (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                הקודם
              </Button>
            ) : (
              <Button variant="outline" onClick={handleSkip}>
                דלג
              </Button>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground mx-4">
              {currentStep + 1} מתוך {tourSteps.length}
            </span>
            <Button onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? "סיום" : "הבא"}
              {currentStep !== tourSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if guided tour should be shown
export function useGuidedTour() {
  const [showTour, setShowTour] = useState(false);
  
  useEffect(() => {
    // Check if this is the user's first visit (no record in localStorage)
    const tourCompleted = localStorage.getItem('guidedTourCompleted');
    if (!tourCompleted) {
      // Wait a moment before showing the tour to allow the page to fully load
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return {
    showTour,
    setShowTour
  };
}