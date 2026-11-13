import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './HudButton.module.css';

export interface HudButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  block?: boolean;
  children: ReactNode;
}

export function HudButton({
  variant = 'ghost',
  block = false,
  className,
  type = 'button',
  children,
  ...rest
}: HudButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        styles.button,
        styles[variant],
        block && styles.block,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
