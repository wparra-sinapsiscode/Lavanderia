import React from 'react';
import { clsx } from 'clsx';

const Card = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx('px-6 py-4 border-b border-gray-200', className)}
      {...props}
    >
      {children}
    </div>
  );
};

const CardContent = ({ className, children, ...props }) => {
  return (
    <div className={clsx('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
};

const CardFooter = ({ className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;