import FormInput from '../components/FormInput';

const Step2ContactDetails = ({ register, errors }) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput
          label="Mobile Number"
          name="mobile"
          type="tel"
          register={register}
          errors={errors}
          placeholder="9876543210"
          maxLength={10}
          required
        />
        <FormInput
          label="Email Address"
          name="email"
          type="email"
          register={register}
          errors={errors}
          placeholder="patient@email.com"
          required
        />
      </div>

      <div className="border-t border-outline-variant/50 pt-5">
        <h3 className="font-body-md font-bold text-on-surface mb-4">Emergency Contact (Optional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormInput
            label="Contact Name"
            name="emergency_contact_name"
            register={register}
            errors={errors}
            placeholder="Emergency contact name"
          />
          <FormInput
            label="Contact Phone"
            name="emergency_contact_phone"
            type="tel"
            register={register}
            errors={errors}
            placeholder="Emergency contact phone"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
};

export default Step2ContactDetails;
