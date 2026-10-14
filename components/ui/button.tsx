import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white",
  secondary: "bg-card text-ink",
  danger: "bg-danger text-white",
  ghost: "bg-transparent text-muted",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  big?: boolean;
};

export function Button({
  variant = "primary",
  big = false,
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold transition-opacity disabled:opacity-50",
        big ? "h-14 px-8 text-body" : "h-11 px-5 text-small",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
