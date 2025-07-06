import { cn } from '@/utils';

interface Context7LogoProps {
  className?: string;
}

export function Context7Logo({ className }: Context7LogoProps) {
  return (
    <svg
      viewBox="0 0 42 47"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', className)}
    >
      {/* Context7 Logo - "7" with brackets styled design */}
      {/* Left bracket */}
      <path
        d="M11.94 26.6C11.94 32.54 9.53 37.49 5.61 42.06H14.74V46.48H0.74V42.28C5.03 37.44 6.68 33.49 6.68 26.6H11.94Z"
        className="fill-foreground dark:fill-background"
      />
      {/* Right bracket */}
      <path
        d="M30.06 26.6C30.06 32.54 32.47 37.49 36.39 42.06H27.26V46.48H41.26V42.28C36.97 37.44 35.32 33.49 35.32 26.6H30.06Z"
        className="fill-foreground dark:fill-background"
      />
      {/* Top left bracket */}
      <path
        d="M11.94 19.96C11.94 14.02 9.53 9.07 5.61 4.5H14.74V0.08H0.74V4.28C5.03 9.12 6.68 13.07 6.68 19.96H11.94Z"
        className="fill-foreground dark:fill-background"
      />
      {/* Top right bracket */}
      <path
        d="M30.06 19.96C30.06 14.02 32.47 9.07 36.39 4.5H27.26V0.08H41.26V4.28C36.97 9.12 35.32 13.07 35.32 19.96H30.06Z"
        className="fill-foreground dark:fill-background"
      />
      {/* Seven shape in the middle */}
      <path
        d="M16.5 15H25.5V18H20L18 23.5V27H15V22.5L17.5 15Z"
        className="fill-foreground dark:fill-background"
      />
    </svg>
  );
}
