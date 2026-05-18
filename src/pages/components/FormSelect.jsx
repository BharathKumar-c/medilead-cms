const FormSelect = ({ label, name, register, errors, options, placeholder, required, onChange, ...rest }) => {
  const error = errors[name];
  const registered = register(name);

  return (
    <div>
      <label htmlFor={name} className="block font-caption text-on-surface-variant uppercase mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <select
        id={name}
        {...registered}
        onChange={(e) => {
          registered.onChange(e);
          onChange?.(e);
        }}
        className={`w-full px-4 py-3 pr-10 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest
          focus:outline-none focus:ring-2 transition-all appearance-none
          ${error
            ? 'border-error focus:border-error focus:ring-error/20'
            : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
          }`}
        {...rest}
      >
        <option value="">{placeholder || 'Select an option'}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p className="mt-1 font-caption text-error text-xs">{error.message}</p>
      )}
    </div>
  );
};

export default FormSelect;
