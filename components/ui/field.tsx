import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, className, id, name, ...rest }: Props) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-2">
      <span className="text-[clamp(12px,3.59vw,13px)] font-semibold">{label}</span>
      <input
        id={inputId}
        name={name}
        className={cn(
          "h-[54px] rounded-ctl border-0 bg-card px-4 text-body text-ink placeholder:text-muted",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        {...rest}
      />
      {hint ? <span className="text-caption text-muted">{hint}</span> : null}
      {error ? (
        <span id={`${inputId}-err`} className="text-caption text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
