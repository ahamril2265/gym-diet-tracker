import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cx } from './cx'

export type ButtonVariant = 'accent' | 'dark' | 'surface' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

const variantClass: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-on-accent active:brightness-95',
  dark: 'bg-bg text-fg active:bg-black',
  surface: 'bg-surface-2 text-fg border border-border active:bg-border',
  ghost: 'bg-transparent text-muted active:bg-surface-2',
  danger: 'bg-surface-2 text-danger border border-border active:bg-border',
}

const sizeClass: Record<ButtonSize, string> = {
  md: 'h-12 rounded-btn px-5 text-[15px]',
  sm: 'h-11 rounded-btn-sm px-4 text-[14px]',
}

function buttonClass(variant: ButtonVariant, size: ButtonSize, block: boolean, className?: string) {
  return cx(
    'inline-flex min-w-touch select-none items-center justify-center gap-2 font-bold transition-[filter,background-color] disabled:cursor-not-allowed disabled:opacity-50',
    variantClass[variant],
    sizeClass[size],
    block && 'w-full',
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'accent', size = 'md', block = false, icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, block, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
})

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
}

export function ButtonLink({ variant = 'accent', size = 'md', block = false, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, block, typeof className === 'string' ? className : undefined)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: icon-only buttons need an accessible name. */
  label: string
  variant?: 'surface' | 'ghost' | 'accent'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'surface', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn-sm transition-colors disabled:opacity-50',
        variant === 'surface' && 'border border-border bg-surface-2 text-fg active:bg-border',
        variant === 'ghost' && 'text-fg active:bg-surface-2',
        variant === 'accent' && 'bg-accent text-on-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
