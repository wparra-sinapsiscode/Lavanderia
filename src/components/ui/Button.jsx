import React from 'react';
import { clsx } from 'clsx';

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  loading = false,
  children, 
  ...props 
}, ref) => {
  const baseClasses = 'font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-500 text-gray-900',
    outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'hover:bg-gray-100 focus:ring-gray-500 text-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <button
      ref={ref}
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        disabled && disabledClasses,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;