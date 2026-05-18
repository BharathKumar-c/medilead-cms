import { useState, useEffect, useRef, useCallback } from 'react';
import FormInput from '../components/FormInput';
import FormSelect from '../components/FormSelect';
import api from '../../services/api';

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

const bloodGroupOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const Step1PatientInfo = ({ register, errors, setValue }) => {
  const [uhidLoading, setUhidLoading] = useState(false);
  const debounceTimer = useRef(null);

  const fetchPatientByUhid = useCallback(async (uhid) => {
    if (!uhid || uhid.length < 3) return;

    setUhidLoading(true);
    try {
      const res = await api.getLeadByUhid(uhid);
      const patient = res?.data?.patient;
      if (patient) {
        // Split name into first and last
        const nameParts = (patient.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        if (firstName) setValue('first_name', firstName, { shouldValidate: true });
        if (lastName) setValue('last_name', lastName, { shouldValidate: true });
        if (patient.dob) {
          const dobStr = typeof patient.dob === 'string' ? patient.dob.split('T')[0] : new Date(patient.dob).toISOString().split('T')[0];
          setValue('date_of_birth', dobStr, { shouldValidate: true });
        }
        if (patient.phone) setValue('mobile', patient.phone.replace(/\D/g, '').slice(-10), { shouldValidate: true });
        if (patient.email) setValue('email', patient.email, { shouldValidate: true });

        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'success', title: 'Patient Found', message: `Loaded details for ${patient.name}` } }));
      }
    } catch (err) {
      if (err.code === 'UHID_NOT_FOUND') {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'warning', title: 'UHID Not Found', message: 'No patient found with this UHID. Enter details manually.' } }));
      }
    } finally {
      setUhidLoading(false);
    }
  }, [setValue]);

  // Listen for toast events from this component
  useEffect(() => {
    const handler = (e) => {
      // Forward to Layout's toast system via a broader event
      window.dispatchEvent(new CustomEvent('app-toast', { detail: e.detail }));
    };
    window.addEventListener('toast', handler);
    return () => window.removeEventListener('toast', handler);
  }, []);

  const handleUhidChange = (e) => {
    const value = e.target.value;
    // Clear previous debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // Debounce: fetch after user stops typing for 600ms
    if (value.trim().length >= 3) {
      debounceTimer.current = setTimeout(() => {
        fetchPatientByUhid(value.trim());
      }, 600);
    }
  };

  return (
    <div className="space-y-5">
      {/* UHID field — first, full width, not mandatory */}
      <FormInput
        label="Patient UHID"
        name="patient_uhid"
        register={register}
        errors={errors}
        placeholder="Enter UHID to auto-fill patient details"
        onChange={handleUhidChange}
        suffix={uhidLoading ? (
          <span className="text-xs text-on-surface-variant animate-pulse">Looking up...</span>
        ) : null}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput
          label="First Name"
          name="first_name"
          register={register}
          errors={errors}
          placeholder="Enter first name"
          required
        />
        <FormInput
          label="Last Name"
          name="last_name"
          register={register}
          errors={errors}
          placeholder="Enter last name"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput
          label="Date of Birth"
          name="date_of_birth"
          type="date"
          register={register}
          errors={errors}
          required
        />
        <FormSelect
          label="Gender"
          name="gender"
          register={register}
          errors={errors}
          options={genderOptions}
          placeholder="Select gender"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormSelect
          label="Blood Group"
          name="blood_group"
          register={register}
          errors={errors}
          options={bloodGroupOptions}
          placeholder="Select blood group"
        />
        <div />
      </div>
    </div>
  );
};

export default Step1PatientInfo;
