import type { FC, HTMLAttributes } from 'react';

export type LogoColor = 'default' | 'black' | 'white' | 'zinc' | 'current';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  color?: LogoColor;
  loading?: boolean;
}

export const Logo: FC<LogoProps> = ({
  color = 'default',
  loading = false,
  ...props
}) => {
  const getFillColor = () => {
    switch (color) {
      case 'black':
        return '#18181b';
      case 'white':
        return '#ffffff';
      case 'zinc':
        return '#71717a';
      case 'current':
        return 'currentColor';
      default:
        return '#0f172a';
    }
  };

  return (
    <div
      className={`relative overflow-visible ${props.className || ''} ${
        loading ? 'drop-shadow-xl' : ''
      } aspect-square`}
    >
      <svg
        className="absolute top-0 left-0 h-full w-full overflow-visible"
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="21st logo"
      >
        <title>21st</title>
        <path
          className={loading ? 'animate-pulse' : ''}
          d="M0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20C40 31.0457 31.5 35.5 20 40H40C40 51.0457 31.0457 60 20 60C8.95431 60 0 51.0457 0 40C0 28.9543 9.5 22 20 20H0Z"
          fill={getFillColor()}
        />
        <path
          className={loading ? 'animate-spin' : ''}
          d="M40 60C51.7324 55.0977 60 43.5117 60 30C60 16.4883 51.7324 4.90234 40 0V60Z"
          fill={getFillColor()}
        />
      </svg>
    </div>
  );
};
