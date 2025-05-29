import React from 'react';
import { clsx } from 'clsx';

const Input = React.forwardRef(({ 
  className, 
  type = 'text',
  label,
  error,
  required = false,
  ...props 
}, ref) => {
  const inputClasses = clsx(
    'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm',
    'placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500',
    error && 'border-red-300 focus:ring-red-500 focus:border-red-500',
    className
  );

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;