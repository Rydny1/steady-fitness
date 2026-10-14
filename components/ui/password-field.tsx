"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
};

/** Password input with a show and hide toggle. The toggle is a real button, 44 px, labelled. */
export function PasswordField({ label, error, className, id, name, ...rest }: Props) {
  const auto = useId();
  const inputId = id ?? name ?? auto;
  const [shown, setShown] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[14px] font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type={shown ? "text" : "password"}
          className={cn(
            "h-[54px] w-full rounded-ctl border-0 bg-card pl-4 pr-14 text-body text-ink placeholder:text-muted",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted"
        >
          {shown ? (
            <EyeOff size={20} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Eye size={20} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>
      {error ? (
        <span id={`${inputId}-err`} className="text-caption text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
