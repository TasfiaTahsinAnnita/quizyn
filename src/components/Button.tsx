import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'red' | 'blue' | 'yellow';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const variantClass = `btn_${variant}`;
  const widthClass = fullWidth ? 'full_width' : '';
  
  return (
    <button 
      className={`premium_btn ${variantClass} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
