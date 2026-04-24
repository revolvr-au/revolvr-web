declare namespace JSX {
  interface IntrinsicElements {
    stream: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      controls?: boolean;
      autoplay?: boolean;
      loop?: boolean;
      muted?: boolean;
      playsinline?: boolean;
      style?: React.CSSProperties;
    };
  }
}
