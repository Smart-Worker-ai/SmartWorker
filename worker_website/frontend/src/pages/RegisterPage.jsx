import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, CheckCircle, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

const DISTRICTS = ['Ernakulam','Thiruvananthapuram','Thrissur','Kozhikode','Kottayam',
  'Palakkad','Malappuram','Kollam','Kannur','Alappuzha','Idukki','Kasaragod','Pathanamthitta','Wayanad'];
const JOB_TYPES = ['Electrician','Plumber','Carpenter','AC Technician','Painter','Mason','Welder','Cleaner','Driver','Cook','Other'];

function FileDropzone({ label, hint, accept, file, onFile }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (files) => files[0] && onFile(files[0]),
  });
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-brand-500 bg-brand-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-brand-400 hover:bg-gray-50'}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{isDragActive ? 'Drop here' : 'Drag & drop or click to upload'}</p>
            <p className="text-xs text-gray-400 mt-1">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}

const STEPS = ['Personal Info', 'Job Details', 'Documents', 'Review'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(location.state?.termsAccepted ?? false);

  const [passbookFile, setPassbookFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const { register, handleSubmit, watch, formState: { errors }, trigger, getValues } = useForm({
    defaultValues: { gender: 'Male', dailyRate: 800, experienceYears: 0 },
  });

  const STEP_FIELDS = [
    ['name', 'age', 'gender', 'mobile'],
    ['jobType', 'currentLocation', 'district', 'town', 'interestedLocations', 'dailyRate', 'experienceYears', 'facilitiesRequested'],
    [],
    [],
  ];

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    if (step === 2) {
      if (!passbookFile || !aadharFile || !photoFile) {
        setError('Please upload all three documents before proceeding.');
        return;
      }
    }
    setError('');
    setStep((s) => s + 1);
  };

  const onSubmit = async (data) => {
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions.');
      return;
    }
    if (!passbookFile || !aadharFile || !photoFile) {
      setError('Please upload all three documents.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('age', data.age);
      fd.append('gender', data.gender);
      fd.append('mobile', data.mobile);
      fd.append('address', data.address || '');
      fd.append('district', data.district);
      fd.append('town', data.town);
      fd.append('job_type', data.jobType);
      fd.append('current_location', data.currentLocation);
      fd.append('interested_locations', data.interestedLocations);
      fd.append('facilities_requested', data.facilitiesRequested || '');
      fd.append('daily_rate', data.dailyRate);
      fd.append('experience_years', data.experienceYears);
      fd.append('accepted_terms', 'true');
      fd.append('passbook_photo', passbookFile);
      fd.append('aadhar_photo', aadharFile);
      fd.append('profile_photo', photoFile);

      await axios.post('/api/workers/register', fd);
      navigate('/success');
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const values = getValues();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')} className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-900">Worker Registration</span>
      </nav>

      {/* Progress bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-1 w-12 sm:w-20 rounded transition-colors ${i < step ? 'bg-green-500' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-brand-700">{STEPS[step]}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Step 0 — Personal Info */}
              {step === 0 && (
                <>
                  <Field label="Full Name *" error={errors.name?.message}>
                    <input {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 chars' } })}
                      className="input" placeholder="e.g. Suresh Kumar" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Age *" error={errors.age?.message}>
                      <input type="number" {...register('age', { required: 'Age required', min: { value: 18, message: 'Min 18' }, max: { value: 70, message: 'Max 70' } })}
                        className="input" placeholder="e.g. 28" />
                    </Field>
                    <Field label="Gender *" error={errors.gender?.message}>
                      <select {...register('gender', { required: true })} className="input">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Mobile Number *" error={errors.mobile?.message}>
                    <input {...register('mobile', { required: 'Mobile required', pattern: { value: /^\+?[0-9]{10,15}$/, message: 'Invalid mobile' } })}
                      className="input" placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Address" error={errors.address?.message}>
                    <textarea {...register('address')} className="input" rows={2} placeholder="Your full address" />
                  </Field>
                </>
              )}

              {/* Step 1 — Job Details */}
              {step === 1 && (
                <>
                  <Field label="Job Type *" error={errors.jobType?.message}>
                    <select {...register('jobType', { required: 'Job type required' })} className="input">
                      <option value="">Select...</option>
                      {JOB_TYPES.map(j => <option key={j}>{j}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Daily Rate (₹) *" error={errors.dailyRate?.message}>
                      <input type="number" {...register('dailyRate', { required: true, min: 100 })} className="input" />
                    </Field>
                    <Field label="Experience (years)" error={errors.experienceYears?.message}>
                      <input type="number" {...register('experienceYears', { min: 0, max: 50 })} className="input" />
                    </Field>
                  </div>
                  <Field label="Current Location (District) *" error={errors.currentLocation?.message}>
                    <select {...register('currentLocation', { required: true })} className="input">
                      <option value="">Select...</option>
                      {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Preferred District *" error={errors.district?.message}>
                      <select {...register('district', { required: true })} className="input">
                        <option value="">Select...</option>
                        {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Preferred Town *" error={errors.town?.message}>
                      <input {...register('town', { required: true })} className="input" placeholder="e.g. Kochi" />
                    </Field>
                  </div>
                  <Field label="Interested Locations (comma-separated) *" error={errors.interestedLocations?.message}>
                    <input {...register('interestedLocations', { required: true })} className="input"
                      placeholder="e.g. Kochi, Ernakulam, Kakkanad" />
                  </Field>
                  <Field label="Additional Facilities Requested (optional)">
                    <textarea {...register('facilitiesRequested')} className="input" rows={2}
                      placeholder="e.g. Food, Accommodation, Travel allowance" />
                  </Field>
                </>
              )}

              {/* Step 2 — Documents */}
              {step === 2 && (
                <>
                  <p className="text-sm text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    All documents are stored securely and used only for identity verification.
                    They are never shared with customers.
                  </p>
                  <FileDropzone
                    label="Passbook Front Page *"
                    hint="JPG, PNG or PDF — max 5MB"
                    accept={{ 'image/*': [], 'application/pdf': [] }}
                    file={passbookFile}
                    onFile={setPassbookFile}
                  />
                  <FileDropzone
                    label="Aadhaar Card *"
                    hint="JPG, PNG or PDF — max 5MB"
                    accept={{ 'image/*': [], 'application/pdf': [] }}
                    file={aadharFile}
                    onFile={setAadharFile}
                  />
                  <FileDropzone
                    label="Passport-size Photo *"
                    hint="JPG or PNG — max 2MB"
                    accept={{ 'image/*': [] }}
                    file={photoFile}
                    onFile={setPhotoFile}
                  />
                </>
              )}

              {/* Step 3 — Review */}
              {step === 3 && (
                <>
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">Review your details</h3>
                    {[
                      ['Name', values.name],
                      ['Age', values.age],
                      ['Gender', values.gender],
                      ['Mobile', values.mobile],
                      ['Job Type', values.jobType],
                      ['Daily Rate', `₹${values.dailyRate}`],
                      ['Experience', `${values.experienceYears} years`],
                      ['Current Location', values.currentLocation],
                      ['Preferred District', values.district],
                      ['Preferred Town', values.town],
                      ['Interested Locations', values.interestedLocations],
                      ['Facilities Requested', values.facilitiesRequested || 'None'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-semibold text-gray-900 text-right max-w-[60%]">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-1">
                      <span className="text-gray-500">Documents</span>
                      <span className="text-green-600 font-semibold">3 uploaded ✓</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                      className="w-5 h-5 accent-indigo-600 mt-0.5" />
                    <span className="text-sm text-gray-700">
                      I have read and agree to the{' '}
                      <button type="button" onClick={() => navigate('/terms')} className="text-brand-600 underline font-semibold">
                        Terms & Conditions
                      </button>
                    </span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex gap-4">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={loading || !termsAccepted}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl transition-colors">
                {loading ? 'Submitting…' : 'Submit Registration'}
              </button>
            )}
          </div>
        </form>
      </div>

      <style>{`.input { @apply w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white; }`}</style>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
