import React from 'react';

const variants = {
  primary: 'bg-primary hover:bg-primary-hover text-white',
  success: 'bg-success text-white hover:opacity-90',
  danger: 'bg-danger text-white hover:opacity-90',
  warning: 'bg-warning text-white hover:opacity-90',
  secondary: 'bg-text-secondary text-white hover:opacity-90',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  type = 'button',
  className = '',
  disabled = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} ${sizes[size]}
        font-semibold rounded transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

