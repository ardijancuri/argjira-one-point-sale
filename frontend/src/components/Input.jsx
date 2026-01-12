import React from 'react';

export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  className = '',
  compact = false,
  ...props
}) {
  const wrapperClass = compact ? 'mb-2' : 'mb-4';
  const inputPadding = className.includes('py-') ? '' : (compact ? 'py-1.5' : 'py-2.5');
  
  return (
    <div className={wrapperClass}>
      {label && (
        <label className={`block ${compact ? 'mb-1' : 'mb-2'} font-semibold text-text-primary ${compact ? 'text-xs' : 'text-sm'}`}>
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`
          w-full px-3 ${inputPadding} border border-border rounded
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          transition-all
          ${className}
        `}
        {...props}
      />
    </div>
  );
}

