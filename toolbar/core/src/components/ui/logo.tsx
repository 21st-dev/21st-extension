import type { SVGProps } from 'preact/compat';

export interface IconProps extends SVGProps<SVGSVGElement> {}

export const CursorIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9976 22.5L3.10938 17.25V6.75L11.9976 12V22.5Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9976 6.75H3.10938L11.9976 1.5L20.885 6.74907L11.9976 6.75Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.8869 17.25L11.9976 22.5L16.4432 14.625L20.885 6.74907L20.8869 17.25Z"
      fill="currentColor"
    />
  </svg>
);

// Backward compatibility alias
export const Logo = CursorIcon;
