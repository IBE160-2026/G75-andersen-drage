"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, MouseEvent } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** While the action is pending: aria-disabled, activation ignored, focus kept (NFR-8). */
  pending?: boolean;
};

export function buttonClass(variant: ButtonVariant, extra?: string): string {
  return [styles.button, styles[variant], extra].filter(Boolean).join(" ");
}

export function Button({ variant = "secondary", pending = false, className, onClick, type = "button", ...rest }: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (pending) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <button
      {...rest}
      type={type}
      className={buttonClass(variant, className)}
      data-variant={variant}
      aria-disabled={pending ? true : undefined}
      onClick={handleClick}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

/** A navigation link styled as a button (for example the top bar 'Innstillinger'). */
export function ButtonLink({ variant = "ghost", className, ...rest }: ButtonLinkProps) {
  return <Link {...rest} className={buttonClass(variant, className)} />;
}
