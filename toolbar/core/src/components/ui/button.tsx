import { Button as HeadlessButton, type ButtonProps } from '@headlessui/react';
import { cn } from '@/utils';
import { forwardRef, type ComponentPropsWithoutRef } from 'preact/compat';

export interface CustomButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'link';
  size?: 'icon' | 'sm' | 'md' | 'lg';
  className?: string;
}

const buttonVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300',
  ghost:
    'text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:text-gray-400',
  link: 'text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline disabled:text-gray-400',
};

const buttonSizes = {
  icon: 'p-0', // For icon buttons - no padding
  sm: 'h-6 px-1.5 py-0.5 text-xs',
  md: 'h-8 px-3 py-1.5 text-sm',
  lg: 'h-10 px-4 py-2 text-base',
};

export const Button = forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <HeadlessButton
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          // Remove all borders and outlines aggressively
          'border-0 border-none shadow-none outline-none',
          'focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:ring-offset-0',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          // Disabled styles
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          // Variant styles
          buttonVariants[variant],
          // Size styles
          buttonSizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
