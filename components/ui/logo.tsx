type LogoSize = "sm" | "md" | "lg";

const sizeStyles: Record<LogoSize, { box: string; text: string }> = {
  sm: { box: "w-8 h-8 rounded", text: "text-sm" },
  md: { box: "w-9 h-9 rounded", text: "text-base" },
  lg: { box: "w-14 h-14 rounded", text: "text-2xl" },
};

interface LogoProps {
  size?: LogoSize;
  withWordmark?: boolean;
}

export function Logo({ size = "md", withWordmark = false }: LogoProps) {
  const styles = sizeStyles[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${styles.box} bg-[var(--color-brand)] flex items-center justify-center`}
      >
        <span className={`${styles.text} text-white font-bold`}>T</span>
      </div>
      {withWordmark && (
        <span className="font-bold text-lg text-[var(--color-foreground)]">
          Tally
        </span>
      )}
    </div>
  );
}
