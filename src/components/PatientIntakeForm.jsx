import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { pincodeData } from '../data/mockData';
import api from '../services/api';

const emptyForm = {
  uhid: '', name: '', dob: '', age: '', contactNumber: '', alternateContact: '',
  email: '', pincode: '', area: '', city: '', state: '', country: 'India', address: '',
  leadSource: '', status: 'New', priority: 'Medium', remarks: '',
};

const PatientIntakeForm = ({ isOpen, onClose, onSuccess, onError, prefillPhone = '' }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [uhidLoading, setUhidLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [priorities, setPriorities] = useState(['High', 'Medium', 'Low']);
  const [statuses, setStatuses] = useState(['New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected']);
  const [areas, setAreas] = useState([]);
  const uhidTimerRef = useRef(null);
  const pincodeTimerRef = useRef(null);
  const uhidRequestId = useRef(0);
  const pincodeRequestId = useRef(0);

  useEffect(() => {
    if (isOpen) {
      api.getLeadSources().then(res => {
        if (res?.data) {
          if (res.data.sources) setLeadSources(res.data.sources);
          if (res.data.priorities) setPriorities(res.data.priorities);
          if (res.data.statuses) setStatuses(res.data.statuses);
        }
      }).catch(() => {});
      // Pre-fill phone number if provided
      if (prefillPhone) {
        setFormData(prev => ({ ...prev, contactNumber: prefillPhone }));
      }
    } else {
      // Reset form and cancel pending lookups when closed
      setFormData(emptyForm);
      setErrors({});
      if (uhidTimerRef.current) { clearTimeout(uhidTimerRef.current); uhidTimerRef.current = null; }
      if (pincodeTimerRef.current) { clearTimeout(pincodeTimerRef.current); pincodeTimerRef.current = null; }
    }
  }, [isOpen, prefillPhone]);

  const clearError = (field) => {
    setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
  };

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const calculateAge = (dob) => {
    if (!dob || dob.length < 10) return;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    setFormData(prev => ({ ...prev, age: age > 0 ? `${age} YRS` : '' }));
  };

  const handleDobChange = (e) => {
    const dob = e.target.value;
    setFormData(prev => ({ ...prev, dob, age: '' }));
    clearError('dob');
    if (dob.length === 10) calculateAge(dob);
  };

  // UHID lookup with 2s debounce
  const handleUhidChange = (e) => {
    const uhid = e.target.value;
    setFormData(prev => ({ ...prev, uhid }));
    clearError('uhid');

    if (uhidTimerRef.current) clearTimeout(uhidTimerRef.current);

    // If UHID is cleared, reset auto-filled fields
    if (!uhid.trim()) {
      setFormData(prev => ({
        ...prev,
        uhid: '',
        name: '', dob: '', age: '', contactNumber: '', alternateContact: '',
        email: '', pincode: '', city: '', state: '', country: 'India', address: '',
      }));
      return;
    }

    if (uhid.length >= 4) {
      const requestId = ++uhidRequestId.current;
      uhidTimerRef.current = setTimeout(async () => {
        setUhidLoading(true);
        // Clear auto-filled fields before lookup
        setFormData(prev => ({
          ...prev,
          name: '', dob: '', age: '', contactNumber: '', alternateContact: '',
          email: '', pincode: '', city: '', state: '', country: 'India', address: '',
        }));
        try {
          const res = await api.getLeadByUhid(uhid);
          if (requestId !== uhidRequestId.current) return;
          if (res?.data?.patient) {
            const p = res.data.patient;
            setFormData(prev => ({
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
            if (p.dob) calculateAge(p.dob.split('T')[0]);
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
  const handlePincodeChange = (e) => {
    const pincode = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, pincode, area: '', city: '', state: '', country: 'India' }));
    setAreas([]);
    clearError('pincode');

    if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);

    if (pincode.length === 6) {
      const requestId = ++pincodeRequestId.current;
      pincodeTimerRef.current = setTimeout(async () => {
        setPincodeLoading(true);
        try {
          const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
          if (requestId !== pincodeRequestId.current) return;
          const data = await resp.json();
          if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const postOffices = data[0].PostOffice;
            const po = postOffices[0];
            const areaNames = [...new Set(postOffices.map(p => p.Name))];
            setAreas(areaNames);
            setFormData(prev => ({
              ...prev,
              area: areaNames.length === 1 ? areaNames[0] : '',
              city: po.District || po.Block || po.Name || '',
              state: po.State || '',
              country: 'India',
            }));
          } else {
            // Fallback to local data
            const local = pincodeData[pincode];
            if (local) {
              setFormData(prev => ({ ...prev, city: local.city, state: local.state, country: local.country }));
            }
          }
        } catch {
          if (requestId !== pincodeRequestId.current) return;
          // Offline fallback
          const local = pincodeData[pincode];
          if (local) {
            setFormData(prev => ({ ...prev, city: local.city, state: local.state, country: local.country }));
          }
        } finally {
          if (requestId === pincodeRequestId.current) setPincodeLoading(false);
        }
      }, 500);
    }
  };

  const validate = () => {
    const errs = {};
    // Only name and phone are mandatory
    if (!formData.name.trim()) errs.name = 'Patient name is required';
    if (!formData.contactNumber.trim()) errs.contactNumber = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\s/g, ''))) errs.contactNumber = 'Enter a valid 10-digit phone number';
    // Optional fields - validate format only if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';
    if (formData.dob && new Date(formData.dob) > new Date()) errs.dob = 'Date of birth cannot be in the future';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Scroll to first error
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createLead({
        name: formData.name,
        uhid: formData.uhid,
        phone: formData.contactNumber,
        alternate_contact: formData.alternateContact,
        email: formData.email,
        dob: formData.dob,
        address: formData.address,
        pincode: formData.pincode,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        lead_source: formData.leadSource,
        status: formData.status,
        priority: formData.priority,
        clinical_remarks: formData.remarks,
      });
      if (onSuccess) onSuccess(`${formData.name} has been added to the patient list.`);
      setFormData(emptyForm);
      setErrors({});
      onClose();
      window.dispatchEvent(new Event('leadCreated'));
    } catch (err) {
      if (onError) onError(err.message || 'Failed to save patient. Please try again.');
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

  const selectClass = (field) =>
    `w-full px-4 py-3 pr-10 border rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:ring-2 transition-all appearance-none ${
      errors[field]
        ? 'border-error focus:border-error focus:ring-error/20'
        : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
    }`;

  const readOnlyClass = 'w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container focus:outline-none';

  const ErrorMsg = ({ field }) => errors[field] ? <p className="font-caption text-error mt-1">{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <h2 className="font-h2 text-on-surface">Patient Intake Form</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* UHID */}
          <div data-field="uhid">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">UHID (UNIVERSAL ID)</label>
            <div className="relative">
              <input type="text" placeholder="Enter UHID to auto-fill patient details" value={formData.uhid} onChange={handleUhidChange} className={fieldClass('uhid')} />
              {uhidLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>}
            </div>
            <ErrorMsg field="uhid" />
          </div>

          {/* Patient Name */}
          <div data-field="name">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Patient Name <span className="text-error">*</span></label>
            <input type="text" placeholder="Enter full name" value={formData.name} onChange={(e) => setField('name', e.target.value)} className={fieldClass('name')} />
            <ErrorMsg field="name" />
          </div>

          {/* DOB + Age + Lead Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div data-field="dob">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Date of Birth <span className="text-error">*</span></label>
              <input type="date" value={formData.dob} onChange={handleDobChange} className={fieldClass('dob')} />
              {formData.age && <p className="font-caption text-secondary mt-1 font-bold">{formData.age}</p>}
              <ErrorMsg field="dob" />
            </div>
            <div data-field="leadSource">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Lead Source <span className="text-error">*</span></label>
              <div className="relative">
                <select value={formData.leadSource} onChange={(e) => setField('leadSource', e.target.value)} className={selectClass('leadSource')}>
                  <option value="">Select lead source</option>
                  {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
              <ErrorMsg field="leadSource" />
            </div>
            <div data-field="priority">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Priority</label>
              <div className="relative">
                <select value={formData.priority} onChange={(e) => setField('priority', e.target.value)} className={selectClass('priority')}>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status */}
          <div data-field="status">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Status</label>
            <div className="relative w-full sm:w-1/3">
              <select value={formData.status} onChange={(e) => setField('status', e.target.value)} className={selectClass('status')}>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="contactNumber">
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Phone Number <span className="text-error">*</span></label>
              <input type="tel" placeholder="9876543210" maxLength={10} value={formData.contactNumber} onChange={(e) => setField('contactNumber', e.target.value.replace(/\D/g, ''))} className={fieldClass('contactNumber')} />
              <ErrorMsg field="contactNumber" />
            </div>
            <div>
              <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Alternate Number</label>
              <input type="tel" placeholder="9876543210" maxLength={10} value={formData.alternateContact} onChange={(e) => setField('alternateContact', e.target.value.replace(/\D/g, ''))} className={fieldClass('alternateContact')} />
            </div>
          </div>

          {/* Email */}
          <div data-field="email">
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Email ID <span className="text-error">*</span></label>
            <input type="email" placeholder="example@email.com" value={formData.email} onChange={(e) => setField('email', e.target.value)} className={fieldClass('email')} />
            <ErrorMsg field="email" />
          </div>

          {/* Address Section */}
          <div className="bg-surface-container rounded-xl p-5 space-y-4">
            <h3 className="font-h3 text-on-surface flex items-center gap-2">
              <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Address Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div data-field="pincode">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Pincode</label>
                <div className="relative">
                  <input type="text" placeholder="110001" maxLength={6} value={formData.pincode} onChange={handlePincodeChange} className={fieldClass('pincode')} />
                  {pincodeLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                <ErrorMsg field="pincode" />
              </div>
              {areas.length > 1 ? (
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Area</label>
                  <div className="relative">
                    <select value={formData.area} onChange={(e) => setField('area', e.target.value)} className={`${fieldClass('area')} appearance-none pr-10`}>
                      <option value="">Select area</option>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Area</label>
                  <input type="text" value={formData.area} readOnly className={readOnlyClass} placeholder="Auto-fills" />
                </div>
              )}
              <div data-field="city">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">City</label>
                <input type="text" value={formData.city} readOnly className={readOnlyClass} placeholder="Auto-fills" />
                <ErrorMsg field="city" />
              </div>
              <div data-field="state">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">State</label>
                <input type="text" value={formData.state} readOnly className={readOnlyClass} placeholder="Auto-fills" />
                <ErrorMsg field="state" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Country</label>
                <input type="text" value={formData.country} readOnly className={readOnlyClass} placeholder="Auto-fills" />
              </div>
              <div data-field="address">
                <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Residential Address</label>
                <input type="text" placeholder="Flat/House No., Building Name, Street" value={formData.address} onChange={(e) => setField('address', e.target.value)} className={fieldClass('address')} />
              <ErrorMsg field="address" />
            </div>
          </div>

          {/* Clinical Remarks */}
          <div>
            <label className="block font-caption text-on-surface-variant uppercase mb-1.5">Clinical Remarks</label>
            <textarea rows={3} placeholder="Add any relevant clinical notes or remarks" value={formData.remarks} onChange={(e) => setField('remarks', e.target.value)} className="w-full px-4 py-3 border border-outline-variant rounded-lg font-body-md text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-on-surface-variant/50 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
          <button onClick={onClose} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">Discard Changes</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Saving...' : 'Confirm & Save Intake'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientIntakeForm;
