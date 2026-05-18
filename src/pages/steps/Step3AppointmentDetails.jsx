import { useState, useEffect } from 'react';
import FormSelect from '../components/FormSelect';
import FormInput from '../components/FormInput';
import SlotPicker from '../components/SlotPicker';
import api from '../../services/api';

const visitTypeOptions = [
  { value: 'First consultation', label: 'First Consultation' },
  { value: 'Follow-up', label: 'Follow-up' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Health check-up', label: 'Health Check-up' },
];

const modeOptions = [
  { value: 'In-person', label: 'In-person' },
  { value: 'Video call', label: 'Video Call' },
  { value: 'Phone call', label: 'Phone Call' },
];

const Step3AppointmentDetails = ({ register, errors, setValue, watch, control }) => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const selectedDoctor = watch('doctor_id');
  const selectedDate = watch('appointment_date');

  useEffect(() => {
    api.getDepartments().then(res => {
      if (res?.data?.departments) {
        const depts = Array.isArray(res.data.departments)
          ? res.data.departments.map(d => typeof d === 'string' ? { value: d, label: d } : { value: d.id || d.name, label: d.name || d })
          : [];
        setDepartments(depts);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      setDoctors([]);
      setValue('doctor_id', '');
      return;
    }

    setLoadingDoctors(true);
    api.getDoctors(selectedDepartment).then(res => {
      if (res?.data?.doctors) {
        setDoctors(res.data.doctors.map(d => ({
          value: d.id,
          label: d.name + (d.specialty ? ` — ${d.specialty}` : ''),
        })));
      }
    }).catch(() => {
      setDoctors([]);
    }).finally(() => {
      setLoadingDoctors(false);
    });
  }, [selectedDepartment, setValue]);

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    setValue('department_id', value, { shouldValidate: true });
    setDoctors([]);
    setValue('doctor_id', '');
  };

  useEffect(() => {
    setValue('time_slot_id', '');
  }, [selectedDoctor, selectedDate, setValue]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormSelect
          label="Department"
          name="department_id"
          register={register}
          errors={errors}
          options={departments}
          placeholder="Select department"
          required
          onChange={handleDepartmentChange}
        />
        <FormSelect
          label="Doctor"
          name="doctor_id"
          register={register}
          errors={errors}
          options={doctors}
          placeholder={loadingDoctors ? 'Loading doctors...' : 'Select doctor'}
          required
          disabled={!selectedDepartment || loadingDoctors}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormInput
          label="Appointment Date"
          name="appointment_date"
          type="date"
          register={register}
          errors={errors}
          required
          min={new Date().toISOString().split('T')[0]}
        />
        <FormSelect
          label="Visit Type"
          name="visit_type"
          register={register}
          errors={errors}
          options={visitTypeOptions}
          placeholder="Select visit type"
          required
        />
      </div>

      <FormSelect
        label="Consultation Mode"
        name="mode"
        register={register}
        errors={errors}
        options={modeOptions}
        placeholder="Select mode"
        required
      />

      <SlotPicker
        doctorId={selectedDoctor}
        date={selectedDate}
        value={watch('time_slot_id')}
        onChange={(val) => setValue('time_slot_id', val, { shouldValidate: true })}
        error={errors.time_slot_id}
      />
    </div>
  );
};

export default Step3AppointmentDetails;
