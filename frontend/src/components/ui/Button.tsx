import { clsx } from "clsx";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={clsx(
        "rounded-xl px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-brand-primary text-white shadow-glow hover:opacity-95"
          : "bg-white/5 text-white border border-white/10 hover:bg-white/10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
