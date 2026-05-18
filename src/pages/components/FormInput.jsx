const FormInput = ({ label, name, register, errors, type = 'text', placeholder, required, onChange, suffix, ...rest }) => {
  const error = errors[name];
  const registered = register(name);

  return (
    <div>
      <label htmlFor={name} className="block font-caption text-on-surface-variant uppercase mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          {...registered}
          onChange={(e) => {
            registered.onChange(e);
            onChange?.(e);
          }}
          className={`w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest
            focus:outline-none focus:ring-2 transition-all
            ${suffix ? 'pr-24' : ''}
            ${error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
            }`}
          {...rest}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 font-caption text-error text-xs">{error.message}</p>
      )}
    </div>
  );
};

export default FormInput;
