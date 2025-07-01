import { cn } from '@/utils';
import { Button, type ButtonProps } from '@headlessui/react';
import type { VNode } from 'preact';
import { forwardRef } from 'preact/compat';
import { ToolbarItem } from './item';

export interface ToolbarButtonProps extends ButtonProps {
  badgeContent?: VNode;
  badgeClassName?: string;
  statusDot?: boolean;
  statusDotClassName?: string;
  tooltipHint?: string;
  variant?: 'default' | 'promoted';
  active?: boolean;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  (
    {
      badgeContent,
      badgeClassName,
      statusDot,
      statusDotClassName,
      tooltipHint,
      variant = 'default',
      active,
      ...props
    },
    ref,
  ) => {
    const button = (
      <Button
        ref={ref}
        {...props}
        className={cn(
          'flex items-center justify-center rounded-full bg-background p-1 text-foreground transition-all duration-150 hover:brightness-125',
          variant === 'default' ? 'size-8' : 'h-8 rounded-full',
          active && 'bg-background/40',
          props.className,
        )}
      />
    );
    return (
      <ToolbarItem
        badgeContent={badgeContent}
        badgeClassName={badgeClassName}
        statusDot={statusDot}
        statusDotClassName={statusDotClassName}
      >
        {button}
      </ToolbarItem>
    );
  },
);
ToolbarButton.displayName = 'ToolbarButton';
