import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, X, CalendarDays } from 'lucide-react';
import StepIndicator from '../pages/components/StepIndicator';
import Step1PatientInfo from '../pages/steps/Step1PatientInfo';
import Step2ContactDetails from '../pages/steps/Step2ContactDetails';
import Step3AppointmentDetails from '../pages/steps/Step3AppointmentDetails';
import Step4MedicalReview from '../pages/steps/Step4MedicalReview';
import api from '../services/api';

// Yup schemas per step
const step1Schema = yup.object({
  first_name: yup.string().required('First name is required').min(2, 'Minimum 2 characters'),
  last_name: yup.string().required('Last name is required').min(2, 'Minimum 2 characters'),
  date_of_birth: yup.string()
    .required('Date of birth is required')
    .test('is-past', 'Must be a past date', val => val ? new Date(val) < new Date() : false),
  gender: yup.string().required('Gender is required'),
  blood_group: yup.string().nullable(),
  patient_uhid: yup.string().nullable(),
});

const step2Schema = yup.object({
  mobile: yup.string()
    .required('Mobile number is required')
    .matches(/^[0-9]{10}$/, 'Must be 10 digits'),
  email: yup.string()
    .required('Email is required')
    .email('Invalid email format'),
  emergency_contact_name: yup.string().nullable(),
  emergency_contact_phone: yup.string().nullable().matches(/^[0-9]{0,10}$/, 'Must be 10 digits'),
});

const step3Schema = yup.object({
  branch_id: yup.string().nullable(),
  department_id: yup.string().required('Department is required'),
  doctor_id: yup.string().required('Doctor is required'),
  appointment_date: yup.string()
    .required('Appointment date is required')
    .test('is-future', 'Must be today or a future date', val => {
      if (!val) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(val) >= today;
    }),
  time_slot_id: yup.string().required('Please select a time slot'),
  visit_type: yup.string().required('Visit type is required'),
  mode: yup.string().required('Consultation mode is required'),
});

const step4Schema = yup.object({
  chief_complaint: yup.string()
    .required('Chief complaint is required')
    .min(10, 'Minimum 10 characters'),
  known_allergies: yup.string().nullable(),
  current_medications: yup.string().nullable(),
  existing_conditions: yup.string().nullable(),
  insurance_details: yup.string().nullable(),
  special_notes: yup.string().nullable(),
  consent_given: yup.boolean()
    .required('Consent is required')
    .oneOf([true], 'You must agree to proceed'),
});

const schemas = [step1Schema, step2Schema, step3Schema, step4Schema];

const stepLabels = ['Patient Info', 'Contact', 'Appointment', 'Review'];
const TOTAL_STEPS = 4;

const defaultFormValues = {
  first_name: '', last_name: '', date_of_birth: '', gender: '', blood_group: '', patient_uhid: '',
  mobile: '', email: '', emergency_contact_name: '', emergency_contact_phone: '',
  branch_id: '', department_id: '', doctor_id: '', provider_name: '', appointment_date: '', time_slot_id: '', visit_type: '', mode: '',
  chief_complaint: '', known_allergies: '', current_medications: '', existing_conditions: '',
  insurance_details: '', special_notes: '', consent_given: false,
};

const AppointmentFormSlideOver = ({ isOpen, onClose, onSuccess, onError }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schemas[currentStep - 1]),
    mode: 'onTouched',
    defaultValues: defaultFormValues,
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset(defaultFormValues);
      setCurrentStep(1);
      setSubmitResult(null);
    }
  }, [isOpen, reset]);

  const handleNext = async () => {
    const valid = await trigger();
    if (valid && currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    reset(defaultFormValues);
    setCurrentStep(1);
    setSubmitResult(null);
    onClose();
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        patient_name: `${data.first_name} ${data.last_name}`,
        phone: data.mobile,
        email: data.email,
        department: data.department_id,
        provider_id: data.doctor_id,
        provider_name: data.provider_name || '',
        appointment_date: data.appointment_date,
        appointment_time: data.time_slot_id,
        notes: [
          data.chief_complaint && `Chief Complaint: ${data.chief_complaint}`,
          data.known_allergies && `Allergies: ${data.known_allergies}`,
          data.current_medications && `Medications: ${data.current_medications}`,
          data.existing_conditions && `Conditions: ${data.existing_conditions}`,
          data.insurance_details && `Insurance: ${data.insurance_details}`,
          data.special_notes && `Notes: ${data.special_notes}`,
          `Visit Type: ${data.visit_type}`,
          `Mode: ${data.mode}`,
          data.patient_uhid && `UHID: ${data.patient_uhid}`,
          data.emergency_contact_name && `Emergency Contact: ${data.emergency_contact_name} (${data.emergency_contact_phone || 'N/A'})`,
        ].filter(Boolean).join('\n'),
      };

      const res = await api.bookAppointment(payload);
      setSubmitResult({
        success: true,
        id: res?.data?.appointment?.id || res?.data?.id,
        message: 'Appointment booked successfully!',
      });
      if (onSuccess) onSuccess('Appointment booked successfully!');
    } catch (err) {
      let msg;
      if (err.code === 'SCHEDULING_CONFLICT' || err.status === 409) {
        msg = 'This time slot is already booked by another agent. Please select a different slot.';
      } else {
        msg = err.message || 'Failed to book appointment. Please try again.';
      }
      setSubmitResult({ success: false, message: msg });
      if (onError) onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderStep = () => {
    const props = { register, errors, watch, setValue, control };
    switch (currentStep) {
      case 1: return <Step1PatientInfo {...props} />;
      case 2: return <Step2ContactDetails {...props} />;
      case 3: return <Step3AppointmentDetails {...props} />;
      case 4: return <Step4MedicalReview {...props} />;
      default: return null;
    }
  };

  // Success state
  if (submitResult?.success) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={handleClose} />
        <div className="relative ml-auto w-full max-w-3xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
          <div className="flex items-center justify-between p-5 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-on-tertiary-container/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-on-tertiary-container" />
              </div>
              <h2 className="font-h2 text-on-surface">Book Appointment</h2>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-on-tertiary-container/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-on-tertiary-container" />
              </div>
              <h3 className="font-h2 text-on-surface mb-2">Appointment Confirmed!</h3>
              <p className="font-body-md text-on-surface-variant mb-2">{submitResult.message}</p>
              {submitResult.id && (
                <p className="font-body-md text-on-surface mb-6">
                  Appointment ID: <span className="font-bold text-secondary">#{submitResult.id}</span>
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={handleClose} className="px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 transition-all">
                  Done
                </button>
                <button onClick={() => { setSubmitResult(null); setCurrentStep(1); reset(defaultFormValues); }} className="px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
                  Book Another
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative ml-auto w-full max-w-3xl bg-surface shadow-2xl flex flex-col h-full animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-h2 text-on-surface">Book Appointment</h2>
              <p className="font-caption text-on-surface-variant">Step {currentStep} of {TOTAL_STEPS}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 pt-4">
          <StepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} stepLabels={stepLabels} />
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            {renderStep()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant bg-surface-container-high">
            {currentStep > 1 ? (
              <button type="button" onClick={handleBack} className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <button type="button" onClick={handleClose} className="flex items-center gap-2 px-5 py-2.5 border border-outline-variant rounded-lg font-body-md text-on-surface hover:bg-surface-container transition-all">
                Discard
              </button>
            )}

            {submitResult && !submitResult.success && (
              <p className="font-caption text-error text-sm flex-1 text-center px-2">{submitResult.message}</p>
            )}

            {currentStep < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-on-secondary rounded-lg font-body-md font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Booking...' : 'Confirm'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentFormSlideOver;
