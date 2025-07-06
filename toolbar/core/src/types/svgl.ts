export interface Category {
  category: string;
  total: number;
}

export type ThemeOptions = {
  dark: string;
  light: string;
};

export interface SVGLogo {
  id?: number;
  title: string;
  category: string | string[];
  route: string | ThemeOptions;
  wordmark?: string | ThemeOptions;
  brandUrl?: string;
  url: string;
}
