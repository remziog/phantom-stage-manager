import { Cloud } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 18, text: "text-base" },
  md: { icon: 24, text: "text-lg" },
  lg: { icon: 32, text: "text-2xl" },
};

export function ApexLogo({ size = "md", showText = true, className = "" }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative inline-flex items-center justify-center">
        <Cloud className="text-primary" size={s.icon} strokeWidth={2} />
        <span
          className="absolute inset-0 flex items-center justify-center font-extrabold text-primary"
          style={{ fontSize: s.icon * 0.5, paddingTop: s.icon * 0.1 }}
        >
          A
        </span>
      </div>
      {showText && <span className={`font-bold tracking-display ${s.text}`}>Apex Cloud</span>}
    </div>
  );
}
