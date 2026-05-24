import {useState, useEffect, useRef} from 'react';
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {pincodeData} from '../data/mockData';
import api from '../services/api';
import SlotPicker from '../pages/components/SlotPicker';
import SearchableSelect from './SearchableSelect';

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '—';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  if (diffDays <= 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return then.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const emptyForm = {
  uhid: '',
  name: '',
  dob: '',
  age: '',
  gender: '',
  contactNumber: '',
  alternateContact: '',
  email: '',
  pincode: '',
  area: '',
  city: '',
  state: '',
  country: 'India',
  address: '',
  leadSource: '',
  branchId: '',
  status: '',
  priority: '',
  remarks: '',
};

const emptyAppointment = {
  department: '',
  doctorId: '',
  doctorName: '',
  appointmentDate: '',
  slot: '',
  visitType: '',
  consultationMode: '',
};

const PatientIntakeForm = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  prefillPhone = '',
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [appointmentData, setAppointmentData] = useState(emptyAppointment);
  const [appointmentErrors, setAppointmentErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const doctorRequestId = useRef(0);
  const [uhidLoading, setUhidLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [priorities, setPriorities] = useState(['High', 'Medium', 'Low']);
  const [statuses, setStatuses] = useState([
    'New',
    'Contacted',
    'Interested',
    'Follow-up',
    'Appointment Booked',
    'Closed',
    'Rejected',
  ]);
  const [areas, setAreas] = useState([]);
  const [branches, setBranches] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [duplicateLeads, setDuplicateLeads] = useState([]);
  const [loadingDuplicate, setLoadingDuplicate] = useState(false);
  const uhidTimerRef = useRef(null);
  const pincodeTimerRef = useRef(null);
  const phoneTimerRef = useRef(null);
  const uhidRequestId = useRef(0);
  const pincodeRequestId = useRef(0);

  useEffect(() => {
    if (isOpen) {
      api
        .getLeadSources()
        .then((res) => {
          if (res?.data) {
            if (res.data.sources) setLeadSources(res.data.sources);
            if (res.data.priorities) setPriorities(res.data.priorities);
            if (res.data.statuses) setStatuses(res.data.statuses);
          }
        })
        .catch(() => {});
      api
        .getBranches()
        .then((res) => {
          if (res?.data?.branches) setBranches(res.data.branches);
        })
        .catch(() => {});
      setCallHistory([]);
      setStep(1);
      setAppointmentData(emptyAppointment);
      setAppointmentErrors({});
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
      // Fetch departments for appointment step
      api.getDepartments().then((res) => {
        if (res?.data?.departments) {
          const depts = Array.isArray(res.data.departments)
            ? res.data.departments.map(d => typeof d === 'string' ? { value: d, label: d } : { value: d.name, label: d.name })
            : [];
          setDepartments(depts);
        }
      }).catch(() => {});
      // Pre-fill phone number if provided
      if (prefillPhone) {
        setFormData((prev) => ({...prev, contactNumber: prefillPhone}));
      }
    } else {
      // Reset form and cancel pending lookups when closed
      setFormData(emptyForm);
      setErrors({});
      setStep(1);
      setAppointmentData(emptyAppointment);
      setAppointmentErrors({});
      setDoctors([]);
      if (uhidTimerRef.current) {
        clearTimeout(uhidTimerRef.current);
        uhidTimerRef.current = null;
      }
      if (pincodeTimerRef.current) {
        clearTimeout(pincodeTimerRef.current);
        pincodeTimerRef.current = null;
      }
    }
  }, [isOpen, prefillPhone]);

  // Fetch doctors when department changes (for Step 2)
  useEffect(() => {
    if (!appointmentData.department) {
      doctorRequestId.current++;
      setDoctors([]);
      setAppointmentData(prev => ({...prev, doctorId: '', doctorName: ''}));
      return;
    }
    const requestId = ++doctorRequestId.current;
    setLoadingDoctors(true);
    const branchId = formData.branchId || undefined;
    api.getDoctors(appointmentData.department, branchId).then(res => {
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
  }, [appointmentData.department, formData.branchId]);

  // Clear slot when doctor or date changes
  useEffect(() => {
    setAppointmentData(prev => ({...prev, slot: ''}));
  }, [appointmentData.doctorId, appointmentData.appointmentDate]);

  const setAppointmentField = (field, value) => {
    setAppointmentData(prev => ({...prev, [field]: value}));
    setAppointmentErrors(prev => {
      const next = {...prev};
      delete next[field];
      return next;
    });
  };

  const validateAppointment = () => {
    const errs = {};
    if (!appointmentData.department) errs.department = 'Department is required';
    if (!appointmentData.doctorId) errs.doctorId = 'Doctor is required';
    if (!appointmentData.appointmentDate) errs.appointmentDate = 'Appointment date is required';
    if (!appointmentData.slot) errs.slot = 'Please select a time slot';
    if (!appointmentData.visitType) errs.visitType = 'Visit type is required';
    if (!appointmentData.consultationMode) errs.consultationMode = 'Consultation mode is required';
    return errs;
  };

  const clearError = (field) => {
    setErrors((prev) => {
      const next = {...prev};
      delete next[field];
      return next;
    });
  };

  const setField = (field, value) => {
    setFormData((prev) => ({...prev, [field]: value}));
    clearError(field);
  };

  const calculateAge = (dob) => {
    if (!dob || dob.length < 10) return;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    )
      age--;
    return age > 0 ? age : '';
  };

  const handleDobChange = (e) => {
    const dob = e.target.value;
    clearError('dob');
    const age = calculateAge(dob);
    setFormData((prev) => ({...prev, dob, age: age ? String(age) : ''}));
  };

  const handleAgeChange = (e) => {
    const ageStr = e.target.value.replace(/\D/g, '').slice(0, 3);
    clearError('age');
    if (ageStr) {
      const ageNum = parseInt(ageStr, 10);
      const birthYear = new Date().getFullYear() - ageNum;
      const dobFromAge = `${birthYear}-01-01`;
      setFormData((prev) => ({...prev, age: ageStr, dob: dobFromAge}));
    } else {
      setFormData((prev) => ({...prev, age: '', dob: ''}));
    }
  };

  // UHID lookup with 2s debounce
  const handleUhidChange = (e) => {
    const uhid = e.target.value;
    setFormData((prev) => ({...prev, uhid}));
    clearError('uhid');

    if (uhidTimerRef.current) clearTimeout(uhidTimerRef.current);

    // If UHID is cleared, reset auto-filled fields
    if (!uhid.trim()) {
      setFormData((prev) => ({
        ...prev,
        uhid: '',
        name: '',
        dob: '',
        age: '',
        contactNumber: '',
        alternateContact: '',
        email: '',
        pincode: '',
        city: '',
        state: '',
        country: 'India',
        address: '',
      }));
      return;
    }

    if (uhid.length >= 4) {
      const requestId = ++uhidRequestId.current;
      uhidTimerRef.current = setTimeout(async () => {
        setUhidLoading(true);
        // Clear auto-filled fields before lookup
        setFormData((prev) => ({
          ...prev,
          name: '',
          dob: '',
          age: '',
          contactNumber: '',
          alternateContact: '',
          email: '',
          pincode: '',
          city: '',
          state: '',
          country: 'India',
          address: '',
        }));
        try {
          const res = await api.getLeadByUhid(uhid);
          if (requestId !== uhidRequestId.current) return;
          if (res?.data?.patient) {
            const p = res.data.patient;
            setFormData((prev) => ({
              ...prev,
              name: p.name || '',
              dob: p.dob ? p.dob.split('T')[0] : '',
              contactNumber: p.phone || '',
              alternateContact: p.alternate_contact || '',
              email: p.email || '',
              pincode: p.pincode || '',
              city: p.city || '',
              state: p.state || '',
              country: p.country || 'India',
              address: p.address || '',
            }));
            if (p.dob) {
              const age = calculateAge(p.dob.split('T')[0]);
              if (age) setFormData((prev) => ({...prev, age: String(age)}));
            }
          }
        } catch {
          // Not found — fields already cleared, user can enter manually
        } finally {
          if (requestId === uhidRequestId.current) setUhidLoading(false);
        }
      }, 2000);
    }
  };

  // PIN code lookup with 500ms debounce — online API + local fallback
  const applyPincodeFallback = (pincode) => {
    const local = pincodeData[pincode];
    if (local) {
      const areas = local.areas || [local.city];
      setAreas(areas);
      setFormData((prev) => ({
        ...prev,
        area: areas.length === 1 ? areas[0] : '',
        city: local.city || '',
        state: local.state || '',
        country: local.country || 'India',
      }));
    }
  };

  const handlePincodeChange = (e) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({
      ...prev,
      pincode,
      area: '',
      city: '',
      state: '',
      country: 'India',
    }));
    setAreas([]);
    clearError('pincode');

    if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);

    if (pincode.length === 6) {
      const requestId = ++pincodeRequestId.current;
      pincodeTimerRef.current = setTimeout(async () => {
        setPincodeLoading(true);
        try {
          const resp = await api.lookupPincode(pincode);
          if (requestId !== pincodeRequestId.current) return;
          const d = resp?.data;
          if (d?.areas?.length > 0) {
            setAreas(d.areas);
            setFormData((prev) => ({
              ...prev,
              area: d.areas.length === 1 ? d.areas[0] : '',
              city: d.city || '',
              state: d.state || '',
              country: d.country || 'India',
            }));
          } else {
            // Fallback to local data
            applyPincodeFallback(pincode);
          }
        } catch {
          if (requestId !== pincodeRequestId.current) return;
          // Offline fallback
          applyPincodeFallback(pincode);
        } finally {
          if (requestId === pincodeRequestId.current) setPincodeLoading(false);
        }
      }, 500);
    }
  };

  const validate = () => {
    const errs = {};
    // Patient Name: mandatory, min 2 chars, only valid name characters
    if (!formData.name.trim()) errs.name = 'Patient name is required';
    else if (formData.name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';
    else if (!/^[a-zA-Z\s.'-]+$/.test(formData.name.trim()))
      errs.name = 'Name contains invalid characters';
    // Phone: mandatory, 10 digits
    if (!formData.contactNumber.trim())
      errs.contactNumber = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, '')))
      errs.contactNumber = 'Enter a valid 10-digit phone number';
    // Branch: mandatory
    if (!formData.branchId) errs.branchId = 'Branch is required';
    // Remarks: mandatory, min 2 chars
    if (!formData.remarks.trim()) errs.remarks = 'Remarks are required';
    else if (formData.remarks.trim().length < 2)
      errs.remarks = 'Remarks must be at least 2 characters';
    // Optional fields - validate format only if provided
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errs.email = 'Enter a valid email address';
    return errs;
  };

  const buildLeadPayload = () => ({
    name: formData.name,
    uhid: formData.uhid,
    phone: formData.contactNumber,
    alternate_contact: formData.alternateContact,
    email: formData.email,
    dob: formData.dob,
    gender: formData.gender || undefined,
    address: formData.address,
    area: formData.area || null,
    pincode: formData.pincode,
    city: formData.city,
    state: formData.state,
    country: formData.country,
    lead_source: formData.leadSource,
    branch_id: formData.branchId || null,
    status: formData.status,
    priority: formData.priority,
    clinical_remarks: formData.remarks,
  });

  const handleStep1Next = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async () => {
    const apptErrs = validateAppointment();
    if (Object.keys(apptErrs).length > 0) {
      setAppointmentErrors(apptErrs);
      return;
    }

    setSubmitting(true);
    try {
      // Create lead first
      const leadRes = await api.createLead(buildLeadPayload());
      const leadId = leadRes?.data?.lead?.id;

      // Create appointment
      const selectedDoctor = doctors.find(d => String(d.value) === String(appointmentData.doctorId));
      await api.bookAppointment({
        patient_name: formData.name,
        phone: formData.contactNumber,
        email: formData.email,
        department: appointmentData.department,
        provider_id: appointmentData.doctorId || undefined,
        provider_name: selectedDoctor?.label || '',
        appointment_date: appointmentData.appointmentDate,
        appointment_time: appointmentData.slot,
        visit_type: appointmentData.visitType,
        consultation_mode: appointmentData.consultationMode,
        lead_id: leadId || undefined,
        notes: `Lead #${leadId} — ${formData.remarks}`,
      });

      if (onSuccess)
        onSuccess(`Lead and appointment created for ${formData.name}.`);
      setFormData(emptyForm);
      setErrors({});
      setAppointmentData(emptyAppointment);
      setAppointmentErrors({});
      setStep(1);
      onClose();
      window.dispatchEvent(new Event('leadCreated'));
    } catch (err) {
      if (onError)
        onError(err.message || 'Failed to create lead and appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // For non-appointment statuses, submit lead directly
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
      return;
    }

    setSubmitting(true);
    try {
      await api.createLead(buildLeadPayload());
      if (onSuccess)
        onSuccess(`${formData.name} has been added to the patient list.`);
      setFormData(emptyForm);
      setErrors({});
      onClose();
      window.dispatchEvent(new Event('leadCreated'));
    } catch (err) {
      if (onError)
        onError(err.message || 'Failed to save patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass = (field) =>
    `w-full px-4 py-3 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all placeholder:text-on-surface-variant/50 ${
      errors[field]
        ? 'border-error focus:border-error focus:ring-error/20'
        : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
    }`;

  const readOnlyClass =
    'w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container focus:outline-none';

  const ErrorMsg = ({field}) =>
    errors[field] ? (
      <p className="font-caption text-error mt-1">{errors[field]}</p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">Lead Intake Form</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Step 1: Lead Details */}
        {step === 1 && (
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* UHID */}
          <div data-field="uhid">
            <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              UHID (UNIVERSAL ID)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter UHID to auto-fill patient details"
                value={formData.uhid}
                onChange={handleUhidChange}
                className={fieldClass('uhid')}
              />
              {uhidLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <ErrorMsg field="uhid" />
          </div>

          {/* Patient Name */}
          <div data-field="name">
            <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Patient Name <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter full name"
              value={formData.name}
              onChange={(e) => setField('name', e.target.value)}
              className={fieldClass('name')}
            />
            <ErrorMsg field="name" />
          </div>

          {/* Branch */}
          <SearchableSelect
            label="Branch"
            required
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={formData.branchId}
            onChange={(val) => setField('branchId', val)}
            placeholder="Select Branch"
            error={errors.branchId}
          />

          {/* DOB + Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="dob">
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={handleDobChange}
                className={fieldClass('dob')}
              />
              <ErrorMsg field="dob" />
            </div>
            <div data-field="age">
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Age
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 35"
                value={formData.age}
                onChange={handleAgeChange}
                className={fieldClass('age')}
                maxLength={3}
              />
              <ErrorMsg field="age" />
            </div>
          </div>

          {/* Gender */}
          <SearchableSelect
            label="Gender"
            options={['Male', 'Female', 'Other']}
            value={formData.gender}
            onChange={(val) => setField('gender', val)}
            placeholder="Select gender"
            error={errors.gender}
          />

          {/* Lead Source + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SearchableSelect
              label="Lead Source"
              options={leadSources}
              value={formData.leadSource}
              onChange={(val) => setField('leadSource', val)}
              placeholder="Select lead source"
              error={errors.leadSource}
            />
            <SearchableSelect
              label="Priority"
              options={priorities}
              value={formData.priority}
              onChange={(val) => setField('priority', val)}
              placeholder="Select priority"
            />
          </div>

          {/* Status */}
          <SearchableSelect
            label="Status"
            required
            options={statuses}
            value={formData.status}
            onChange={(val) => setField('status', val)}
            placeholder="Select status"
            error={errors.status}
          />

          {/* Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="contactNumber">
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Phone Number <span className="text-error text-base font-bold leading-none">*</span>
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={formData.contactNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setField('contactNumber', val);
                  setCallHistory([]);
                  setDuplicateLeads([]);
                  if (phoneTimerRef.current)
                    clearTimeout(phoneTimerRef.current);
                  if (val.length === 10) {
                    phoneTimerRef.current = setTimeout(async () => {
                      setLoadingCalls(true);
                      setLoadingDuplicate(true);
                      try {
                        const [callRes, dupRes] = await Promise.all([
                          api.getCallHistoryByPhone(val),
                          api.getLeadByPhone(val),
                        ]);
                        if (callRes?.data?.calls)
                          setCallHistory(callRes.data.calls);
                        if (dupRes?.data?.leads?.length > 0)
                          setDuplicateLeads(dupRes.data.leads);
                      } catch {
                      } finally {
                        setLoadingCalls(false);
                        setLoadingDuplicate(false);
                      }
                    }, 800);
                  }
                }}
                className={fieldClass('contactNumber')}
              />
              <ErrorMsg field="contactNumber" />
            </div>
            <div>
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Alternate Number
              </label>
              <input
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={formData.alternateContact}
                onChange={(e) =>
                  setField(
                    'alternateContact',
                    e.target.value.replace(/\D/g, ''),
                  )
                }
                className={fieldClass('alternateContact')}
              />
            </div>
          </div>

          {/* Call History Panel */}
          {(loadingCalls || callHistory.length > 0) && (
            <div className="bg-surface-container rounded-xl p-4">
              <h3 className="font-h3 text-on-surface flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-secondary" />
                Call History for {formData.contactNumber}
              </h3>
              {loadingCalls ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 font-body-sm text-on-surface-variant">
                    Loading call history...
                  </span>
                </div>
              ) : callHistory.length === 0 ? (
                <p className="font-body-sm text-on-surface-variant text-center py-2">
                  No call history found for this number.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {callHistory.map((call, i) => {
                    const isInbound = call.direction === 'inbound';
                    const isMissed =
                      call.status === 'missed' || call.status === 'no-answer';
                    return (
                      <div
                        key={call.id || i}
                        className="flex items-start gap-3 p-2.5 bg-surface-container-lowest rounded-lg">
                        <div
                          className={`p-1.5 rounded-full ${isMissed ? 'bg-error/10' : isInbound ? 'bg-tertiary/10' : 'bg-secondary/10'}`}>
                          {isMissed ? (
                            <PhoneOff className="w-4 h-4 text-error" />
                          ) : isInbound ? (
                            <PhoneIncoming className="w-4 h-4 text-tertiary" />
                          ) : (
                            <PhoneOutgoing className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-body-sm font-medium text-on-surface">
                              {isInbound ? 'Inbound' : 'Outbound'} &middot;{' '}
                              {call.status}
                            </span>
                            {call.duration > 0 && (
                              <span className="font-caption text-on-surface-variant">
                                {Math.floor(call.duration / 60)}:
                                {String(call.duration % 60).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                          {call.user_name && (
                            <p className="font-caption text-on-surface-variant">
                              Attended by: {call.user_name}
                            </p>
                          )}
                          {call.notes && (
                            <p className="font-caption text-on-surface-variant truncate">
                              {call.notes}
                            </p>
                          )}
                          <p className="font-caption text-on-surface-variant/60 mt-0.5">
                            {formatRelativeTime(call.start_time)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Duplicate Lead Warning */}
          {(loadingDuplicate || duplicateLeads.length > 0) && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <h3 className="font-h3 text-on-surface flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                {loadingDuplicate
                  ? 'Checking for duplicates...'
                  : `Existing lead(s) found for ${formData.contactNumber}`}
              </h3>
              {loadingDuplicate ? (
                <div className="flex items-center justify-center py-3">
                  <div className="w-5 h-5 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {duplicateLeads.map((dl) => (
                    <div
                      key={dl.id}
                      className="flex items-center justify-between p-2.5 bg-surface-container-lowest rounded-lg">
                      <div>
                        <p className="font-body-sm font-medium text-on-surface">
                          {dl.name}
                        </p>
                        <p className="font-caption text-on-surface-variant">
                          UHID: {dl.uhid || '—'} · Status: {dl.status} · Source:{' '}
                          {dl.lead_source || '—'}
                        </p>
                      </div>
                      {dl.created_at && (
                        <p className="font-caption text-on-surface-variant">
                          {formatRelativeTime(dl.created_at)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email */}
          <div data-field="email">
            <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Email ID{' '}
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) => setField('email', e.target.value)}
              className={fieldClass('email')}
            />
            <ErrorMsg field="email" />
          </div>

          {/* Address Section */}
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <h3 className="font-h3 text-on-surface flex items-center gap-2">
              <svg
                className="w-5 h-5 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Address Details
            </h3>

            {/* Row 1: Pincode + Area */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div data-field="pincode">
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Pincode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="600001"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handlePincodeChange}
                    className={fieldClass('pincode')}
                  />
                  {pincodeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <ErrorMsg field="pincode" />
              </div>
              <div className="sm:col-span-3">
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Area
                </label>
                {areas.length > 1 ? (
                  <SearchableSelect
                    options={areas}
                    value={formData.area}
                    onChange={(val) => setField('area', val)}
                    placeholder="Select area"
                  />
                ) : (
                  <input
                    type="text"
                    value={formData.area}
                    readOnly
                    className={readOnlyClass}
                    placeholder="Auto-fills"
                  />
                )}
              </div>
            </div>

            {/* Row 2: City + State + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div data-field="city">
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
                <ErrorMsg field="city" />
              </div>
              <div data-field="state">
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
                <ErrorMsg field="state" />
              </div>
              <div>
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  readOnly
                  className={readOnlyClass}
                  placeholder="Auto-fills"
                />
              </div>
            </div>

            {/* Row 3: Residential Address */}
            <div data-field="address">
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Residential Address
              </label>
              <input
                type="text"
                placeholder="Flat/House No., Building Name, Street"
                value={formData.address}
                onChange={(e) => setField('address', e.target.value)}
                className={fieldClass('address')}
              />
              <ErrorMsg field="address" />
            </div>
          </div>

          {/* Remarks */}
          <div data-field="remarks">
            <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
              Remarks <span className="text-error text-base font-bold leading-none">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Add any relevant clinical notes or remarks"
              value={formData.remarks}
              onChange={(e) => setField('remarks', e.target.value)}
              className={fieldClass('remarks') + ' resize-none'}
            />
            <ErrorMsg field="remarks" />
          </div>
        </div>
        )}

        {/* Step 2: Appointment Details */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Step Indicator */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-body-sm font-bold">1</div>
                <span className="font-body-sm text-on-surface-variant">Lead Details</span>
              </div>
              <div className="flex-1 h-px bg-outline-variant" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-body-sm font-bold">2</div>
                <span className="font-body-sm font-bold text-on-surface">Appointment</span>
              </div>
            </div>

            <p className="font-body-sm text-on-surface-variant">Status is set to <span className="font-bold text-secondary">Appointment Booked</span>. Please fill in the appointment details below.</p>

            {/* Department */}
            <SearchableSelect
              label="Department"
              required
              options={departments}
              value={appointmentData.department}
              onChange={(val) => {
                setAppointmentField('department', val);
                setDoctors([]);
                setAppointmentData(prev => ({...prev, doctorId: '', doctorName: ''}));
              }}
              placeholder="Select department"
              error={appointmentErrors.department}
            />

            {/* Doctor */}
            <SearchableSelect
              label="Doctor"
              required
              options={doctors}
              value={appointmentData.doctorId}
              onChange={(val) => {
                const doc = doctors.find(d => String(d.value) === String(val));
                setAppointmentData(prev => ({...prev, doctorId: val, doctorName: doc?.label || ''}));
                setAppointmentErrors(prev => { const n = {...prev}; delete n.doctorId; return n; });
              }}
              placeholder={loadingDoctors ? 'Loading doctors...' : 'Select doctor'}
              disabled={!appointmentData.department || loadingDoctors}
              error={appointmentErrors.doctorId}
            />

            {/* Appointment Date + Visit Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div data-field="appointmentDate">
                <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                  Appointment Date <span className="text-error text-base font-bold leading-none">*</span>
                </label>
                <input
                  type="date"
                  value={appointmentData.appointmentDate}
                  onChange={(e) => setAppointmentField('appointmentDate', e.target.value)}
                  min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}
                  className={fieldClass('appointmentDate')}
                />
                {appointmentErrors.appointmentDate && <p className="font-caption text-error mt-1">{appointmentErrors.appointmentDate}</p>}
              </div>
              <SearchableSelect
                label="Visit Type"
                required
                options={['First consultation', 'Follow-up', 'Emergency', 'Health check-up']}
                value={appointmentData.visitType}
                onChange={(val) => setAppointmentField('visitType', val)}
                placeholder="Select visit type"
                error={appointmentErrors.visitType}
              />
            </div>

            {/* Consultation Mode */}
            <div data-field="consultationMode">
              <label className="inline-flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
                Consultation Mode <span className="text-error text-base font-bold leading-none">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'In-person', label: 'In-person', icon: '🏥' },
                  { value: 'Video call', label: 'Video Call', icon: '📹' },
                  { value: 'Phone call', label: 'Phone Call', icon: '📞' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAppointmentField('consultationMode', opt.value)}
                    className={`px-4 py-3 rounded-lg border font-body-md text-center transition-all ${
                      appointmentData.consultationMode === opt.value
                        ? 'border-secondary bg-secondary/10 text-secondary font-bold'
                        : 'border-outline-variant text-on-surface-variant hover:border-secondary/50'
                    }`}>
                    <span className="block text-lg mb-0.5">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
              {appointmentErrors.consultationMode && <p className="font-caption text-error mt-1">{appointmentErrors.consultationMode}</p>}
            </div>

            {/* Time Slot */}
            <SlotPicker
              doctorId={appointmentData.doctorId}
              date={appointmentData.appointmentDate}
              value={appointmentData.slot}
              onChange={(slotId) => setAppointmentField('slot', slotId)}
              error={appointmentErrors.slot ? { message: appointmentErrors.slot } : null}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
            {step === 2 ? 'Cancel' : 'Discard Changes'}
          </button>
          {step === 1 ? (
            formData.status === 'Appointment Booked' ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? 'Saving...' : 'Save Intake Without Appointment'}
                </button>
                <button
                  onClick={handleStep1Next}
                  className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                  Next: Appointment Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Saving...' : 'Confirm & Save Intake'}
              </button>
            )
          ) : (
            <button
              onClick={handleStep2Submit}
              disabled={submitting}
              className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Booking...' : 'Confirm & Book Appointment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientIntakeForm;
