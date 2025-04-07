import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.tsx";
import { Info, HelpCircle } from 'lucide-react';
import { Button } from "./button";

interface FeatureTooltipProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
}

export function FeatureTooltip({
  title,
  description,
  icon = <HelpCircle className="h-4 w-4" />,
  position = 'top',
  children
}: FeatureTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="group relative inline-block">
            {children}
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-primary text-white rounded-full p-0.5 shadow-md">
                {icon}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side={position} className="max-w-[300px] p-4 z-50">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PopoverHelpButtonProps {
  title: string;
  description: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function PopoverHelpButton({ title, description, position = 'top' }: PopoverHelpButtonProps) {
  return (
    <FeatureTooltip
      title={title}
      description={description}
      position={position}
      icon={<Info className="h-3.5 w-3.5" />}
    >
      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
        <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
        <span className="sr-only">Help</span>
      </Button>
    </FeatureTooltip>
  );
}