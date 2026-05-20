import { useState, useEffect, useRef } from 'react';
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
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(() => watch('branch_id') || '');
  const [selectedDepartment, setSelectedDepartment] = useState(() => watch('department_id') || '');
  const deptRequestId = useRef(0);
  const doctorRequestId = useRef(0);

  const selectedDoctor = watch('doctor_id');
  const selectedDate = watch('appointment_date');

  // Fetch branches on mount
  useEffect(() => {
    api.getBranches().then(res => {
      if (res?.data?.branches) {
        setBranches(res.data.branches.map(b => ({ value: b.id, label: b.name })));
      }
    }).catch(() => {});
  }, []);

  // Fetch departments when branch changes
  useEffect(() => {
    const requestId = ++deptRequestId.current;

    if (!selectedBranch) {
      api.getDepartments().then(res => {
        if (requestId !== deptRequestId.current) return;
        if (res?.data?.departments) {
          const depts = Array.isArray(res.data.departments)
            ? res.data.departments.map(d => typeof d === 'string' ? { value: d, label: d } : { value: d.name, label: d.name })
            : [];
          setDepartments(depts);
        }
      }).catch(() => {});
      return;
    }

    api.getBranchDepartments(selectedBranch).then(res => {
      if (requestId !== deptRequestId.current) return;
      if (res?.data?.departments) {
        setDepartments(res.data.departments.map(d => ({ value: d.name, label: d.name })));
      }
    }).catch(() => {
      if (requestId === deptRequestId.current) setDepartments([]);
    });

    setSelectedDepartment('');
    setValue('department_id', '');
    setValue('doctor_id', '');
    setValue('provider_name', '');
    setDoctors([]);
  }, [selectedBranch, setValue]);

  // Fetch doctors when department changes
  useEffect(() => {
    if (!selectedDepartment) {
      // Only clear doctor if the form also has no department (user-initiated clear)
      if (!watch('department_id')) {
        doctorRequestId.current++;
        setDoctors([]);
        setValue('doctor_id', '');
        setValue('provider_name', '');
      }
      return;
    }

    const requestId = ++doctorRequestId.current;
    setLoadingDoctors(true);
    api.getDoctors(selectedDepartment, selectedBranch || undefined).then(res => {
      if (requestId !== doctorRequestId.current) return;
      if (res?.data?.doctors) {
        setDoctors(res.data.doctors.map(d => ({
          value: d.id,
          label: d.name + (d.specialty ? ` — ${d.specialty}` : ''),
        })));
      }
    }).catch(() => {
      if (requestId === doctorRequestId.current) setDoctors([]);
    }).finally(() => {
      if (requestId === doctorRequestId.current) setLoadingDoctors(false);
    });
  }, [selectedDepartment, selectedBranch, setValue, watch]);

  // Update provider_name when doctor selection changes
  useEffect(() => {
    if (selectedDoctor && doctors.length > 0) {
      const doc = doctors.find(d => String(d.value) === String(selectedDoctor));
      setValue('provider_name', doc?.label || '');
    } else {
      setValue('provider_name', '');
    }
  }, [selectedDoctor, doctors, setValue]);

  const handleBranchChange = (e) => {
    const value = e.target.value;
    setSelectedBranch(value);
    setValue('branch_id', value);
  };

  const handleDepartmentChange = (e) => {
    const value = e.target.value;
    setSelectedDepartment(value);
    setValue('department_id', value, { shouldValidate: true });
    setDoctors([]);
    setValue('doctor_id', '');
    setValue('provider_name', '');
  };

  useEffect(() => {
    setValue('time_slot_id', '');
  }, [selectedDoctor, selectedDate, setValue]);

  return (
    <div className="space-y-5">
      <FormSelect
        label="Branch"
        name="branch_id"
        register={register}
        errors={errors}
        options={branches}
        placeholder="All branches"
        onChange={handleBranchChange}
      />

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
          min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
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
        onChange={(slotId) => setValue('time_slot_id', slotId, { shouldValidate: true, shouldTouch: true })}
        error={errors.time_slot_id}
      />
    </div>
  );
};

export default Step3AppointmentDetails;
