import { cn } from '@/utils';

interface LucideLogoProps {
  className?: string;
}

export function LucideLogo({ className }: LucideLogoProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Light theme logo */}
      <img
        src="https://lucide.dev/logo.light.svg"
        alt="Lucide"
        className="h-full w-full dark:hidden"
      />
      {/* Dark theme logo */}
      <img
        src="https://lucide.dev/logo.dark.svg"
        alt="Lucide"
        className="hidden h-full w-full dark:block"
      />
    </div>
  );
}
