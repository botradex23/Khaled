import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  isLoading?: boolean;
  onClick?: () => void;
  children: ReactNode;
  actionButton?: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  hoverEffect?: boolean;
}

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
  hover: { 
    y: -5,
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
    transition: { duration: 0.2 } 
  }
};

const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3, delay: 0.1 }
  }
};

export function DashboardCard({
  title,
  description,
  icon,
  footer,
  className,
  contentClassName,
  isLoading = false,
  onClick,
  children,
  actionButton,
  variant = 'default',
  hoverEffect = true
}: DashboardCardProps) {
  // Get the variant style
  const variantStyles = {
    default: '',
    primary: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    danger: 'border-red-500/20 bg-red-500/5',
    info: 'border-blue-500/20 bg-blue-500/5'
  };

  // Get the icon container variant style
  const iconContainerVariants = {
    default: 'bg-muted',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-green-500/20 text-green-500',
    warning: 'bg-yellow-500/20 text-yellow-500',
    danger: 'bg-red-500/20 text-red-500',
    info: 'bg-blue-500/20 text-blue-500'
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hoverEffect ? "hover" : undefined}
      className="h-full"
    >
      <Card 
        className={cn(
          "h-full transition-all duration-200 overflow-hidden",
          variantStyles[variant],
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          
          {icon && (
            <motion.div 
              variants={iconVariants}
              initial="hidden"
              animate="visible"
              className={cn("rounded-full p-2", iconContainerVariants[variant])}
            >
              {icon}
            </motion.div>
          )}
          
          {actionButton && (
            <div>
              {actionButton}
            </div>
          )}
        </CardHeader>
        
        <CardContent className={cn("pt-4", contentClassName)}>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
              <div className="h-4 bg-muted rounded animate-pulse w-2/3"></div>
            </div>
          ) : (
            children
          )}
        </CardContent>
        
        {footer && (
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            {footer}
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}