import { useEffect, useRef, useState, ReactNode, CSSProperties } from "react";

type Variant = "up" | "down" | "left" | "right" | "scale" | "rotate" | "mask";

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: CSSProperties = { transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` };

  return (
    <Tag ref={ref as any} className={`reveal reveal-${variant} ${visible ? "is-visible" : ""} ${className}`} style={style}>
      {children}
    </Tag>
  );
}