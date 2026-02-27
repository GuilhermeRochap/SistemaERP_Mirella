import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

interface ButtonVariantsProps {
  variant?: string;
  size?: string;
  className?: string;
}

const buttonVariants = ({ 
  variant = 'default', 
  size = 'default',
  className
}: ButtonVariantsProps = {}) => {
  const variants: Record<string, string> = {
    default: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
    outline: 'border-2 border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900/20',
    secondary: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
    ghost: 'hover:bg-red-50 text-red-700 dark:text-red-400 dark:hover:bg-red-900/20',
    link: 'text-red-600 underline-offset-4 hover:underline dark:text-red-400',
  }

  const sizes: Record<string, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-sm',
    lg: 'h-12 px-8 text-lg',
    icon: 'h-10 w-10',
  }

  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:pointer-events-none disabled:opacity-50',
    variants[variant] ?? variants['default'],
    sizes[size] ?? sizes['default'],
    className
  )
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
