import FormInput from '../components/FormInput';

const Step4MedicalReview = ({ register, errors, watch, departments, doctors }) => {
  const values = watch();

  const getLabel = (options, value) => {
    const found = options.find(o => String(o.value) === String(value));
    return found ? found.label : value || '—';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <h3 className="font-body-md font-bold text-on-surface">Medical Information</h3>

        <div>
          <label htmlFor="chief_complaint" className="block font-caption text-on-surface-variant uppercase mb-1.5">
            Chief Complaint <span className="text-error">*</span>
          </label>
          <textarea
            id="chief_complaint"
            rows={3}
            {...register('chief_complaint')}
            placeholder="Describe the main reason for this visit (min 10 characters)"
            className={`w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest
              focus:outline-none focus:ring-2 transition-all resize-none
              ${errors.chief_complaint
                ? 'border-error focus:border-error focus:ring-error/20'
                : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
              }`}
          />
          {errors.chief_complaint && (
            <p className="mt-1 font-caption text-error text-xs">{errors.chief_complaint.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormInput
            label="Known Allergies"
            name="known_allergies"
            register={register}
            errors={errors}
            placeholder="e.g. Penicillin, Peanuts"
          />
          <FormInput
            label="Current Medications"
            name="current_medications"
            register={register}
            errors={errors}
            placeholder="e.g. Metformin 500mg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FormInput
            label="Existing Conditions"
            name="existing_conditions"
            register={register}
            errors={errors}
            placeholder="e.g. Diabetes, Hypertension"
          />
          <FormInput
            label="Insurance / TPA Details"
            name="insurance_details"
            register={register}
            errors={errors}
            placeholder="Policy number or TPA name"
          />
        </div>

        <div>
          <label htmlFor="special_notes" className="block font-caption text-on-surface-variant uppercase mb-1.5">
            Special Notes
          </label>
          <textarea
            id="special_notes"
            rows={2}
            {...register('special_notes')}
            placeholder="Any additional notes for the doctor"
            className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all resize-none"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="consent_given"
            {...register('consent_given')}
            className="mt-1 w-4 h-4 rounded border-outline-variant text-secondary focus:ring-secondary"
          />
          <label htmlFor="consent_given" className="font-body-md text-on-surface cursor-pointer">
            I confirm that the information provided is accurate and I consent to the appointment booking. <span className="text-error">*</span>
          </label>
        </div>
        {errors.consent_given && (
          <p className="font-caption text-error text-xs">{errors.consent_given.message}</p>
        )}
      </div>

      {/* Summary Card */}
      <div className="border-t border-outline-variant/50 pt-6">
        <h3 className="font-body-md font-bold text-on-surface mb-4">Appointment Summary</h3>
        <div className="bg-surface-container-high rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SummaryRow label="Patient" value={`${values.first_name || ''} ${values.last_name || ''}`.trim() || '—'} />
            <SummaryRow label="Date of Birth" value={values.date_of_birth || '—'} />
            <SummaryRow label="Gender" value={values.gender || '—'} />
            <SummaryRow label="Blood Group" value={values.blood_group || '—'} />
            <SummaryRow label="Mobile" value={values.mobile || '—'} />
            <SummaryRow label="Email" value={values.email || '—'} />
            <SummaryRow label="Department" value={getLabel(departments, values.department_id)} />
            <SummaryRow label="Doctor" value={getLabel(doctors, values.doctor_id)} />
            <SummaryRow label="Date" value={values.appointment_date || '—'} />
            <SummaryRow label="Time Slot" value={values.time_slot_id || '—'} />
            <SummaryRow label="Visit Type" value={values.visit_type || '—'} />
            <SummaryRow label="Mode" value={values.mode || '—'} />
          </div>
          {values.chief_complaint && (
            <div className="pt-2 border-t border-outline-variant/50">
              <p className="font-caption text-on-surface-variant uppercase mb-1">Chief Complaint</p>
              <p className="font-body-md text-on-surface">{values.chief_complaint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div>
    <p className="font-caption text-on-surface-variant uppercase text-xs">{label}</p>
    <p className="font-body-md text-on-surface">{value}</p>
  </div>
);

export default Step4MedicalReview;
