import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  Upload, CheckCircle, ArrowLeft, ArrowRight, AlertCircle,
  User, Briefcase, FileText, ClipboardCheck, ShieldCheck, Lock, Star,
} from 'lucide-react';

const DISTRICTS = [
  'Ernakulam','Thiruvananthapuram','Thrissur','Kozhikode','Kottayam',
  'Palakkad','Malappuram','Kollam','Kannur','Alappuzha','Idukki','Kasaragod','Pathanamthitta','Wayanad',
];
const JOB_TYPES = [
  'Electrician','Plumber','Carpenter','AC Technician','Painter',
  'Mason','Welder','Cleaner','Driver','Cook','Other',
];

const STEPS = [
  { label: 'Personal Info',  icon: User,           desc: 'Tell us who you are' },
  { label: 'Job Details',    icon: Briefcase,       desc: 'Your skills & preferences' },
  { label: 'Documents',      icon: FileText,        desc: 'Verification documents' },
  { label: 'Review',         icon: ClipboardCheck,  desc: 'Confirm & submit' },
];

function FileDropzone({ label, hint, accept, file, onFile }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept, maxFiles: 1,
    onDrop: (files) => files[0] && onFile(files[0]),
  });
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
            : file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white'
          }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="flex items-center justify-center gap-3 text-emerald-700">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-emerald-600">Uploaded successfully</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {isDragActive ? 'Release to upload' : 'Drag & drop or click to browse'}
            </p>
            <p className="text-xs text-slate-400 mt-1">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      {children}
      {error && (
        <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = `w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-900
  placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
  focus:bg-white transition-all duration-150`;

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

  // Intercept browser back button to go back one step instead of leaving the page
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => {
    window.history.pushState(null, '', window.location.pathname);
    const handlePop = () => {
      if (stepRef.current > 0) {
        setStep(s => s - 1);
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const STEP_FIELDS = [
    ['name', 'age', 'gender', 'mobile', 'email', 'address'],
    ['jobType', 'currentLocation', 'district', 'town', 'interestedLocations', 'dailyRate', 'experienceYears'],
    [], [],
  ];

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    if (step === 2 && (!passbookFile || !aadharFile || !photoFile)) {
      setError('Please upload all three documents before proceeding.');
      return;
    }
    setError('');
    setStep(s => s + 1);
  };

  const onSubmit = async (data) => {
    if (!termsAccepted) { setError('You must accept the Terms & Conditions.'); return; }
    if (!passbookFile || !aadharFile || !photoFile) { setError('Please upload all three documents.'); return; }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries({
        name: data.name, age: data.age, gender: data.gender, mobile: data.mobile,
        email: data.email,
        address: data.address || '', district: data.district, town: data.town,
        job_type: data.jobType, current_location: data.currentLocation,
        interested_locations: data.interestedLocations,
        facilities_requested: data.facilitiesRequested || '',
        daily_rate: data.dailyRate, experience_years: data.experienceYears, accepted_terms: 'true',
      }).forEach(([k, v]) => fd.append(k, v));
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
  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex md:w-72 lg:w-80 bg-gradient-to-b from-slate-900 to-indigo-950 text-white flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-8 border-b border-white/10">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-base">Smart Workers</p>
              <p className="text-xs text-white/50">Worker Registration</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.label} className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
                ${active ? 'bg-indigo-600 shadow-lg shadow-indigo-900/40' : done ? 'bg-white/5' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${active ? 'bg-white/20' : done ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/70'}`}>{s.label}</p>
                  <p className="text-xs text-white/40">{s.desc}</p>
                </div>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />}
              </div>
            );
          })}
        </nav>

        <div className="p-6 space-y-3 border-t border-white/10">
          {[
            { icon: Lock, text: 'Bank-grade data encryption' },
            { icon: ShieldCheck, text: 'Verified before going live' },
            { icon: Star, text: 'Rated 4.7★ by workers' },
          ].map(({ icon: I, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/50 text-xs">
              <I className="w-4 h-4 shrink-0" />{text}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Form Area ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-slate-100 sticky top-0 z-10 px-4 h-14 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-900 flex-1">Worker Registration</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
            {step + 1}/{STEPS.length}
          </span>
        </header>

        {/* Mobile progress bar */}
        <div className="md:hidden bg-white border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300
                ${i < step ? 'bg-emerald-500' : i === step ? 'bg-indigo-600' : 'bg-slate-100'}`} />
            ))}
          </div>
          <p className="text-xs font-semibold text-indigo-700">{STEPS[step].label} — {STEPS[step].desc}</p>
        </div>

        {/* Form content */}
        <div className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-2xl w-full mx-auto">

          {/* Step header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">{STEPS[step].label}</h1>
              <p className="text-sm text-slate-500">{STEPS[step].desc}</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
                className="space-y-5">

                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                  <>
                    <InputField label="Full Name *" error={errors.name?.message}>
                      <input {...register('name', {
                        required: 'Full name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' },
                        maxLength: { value: 80, message: 'Name must be under 80 characters' },
                        pattern: { value: /^[a-zA-Z\s.'-]+$/, message: 'Name can only contain letters and spaces' },
                      })} className={inputCls} placeholder="e.g. Suresh Kumar" />
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Age *" error={errors.age?.message}>
                        <input type="number" {...register('age', {
                          required: 'Age is required',
                          min: { value: 18, message: 'Must be at least 18 years old' },
                          max: { value: 70, message: 'Must be under 70 years old' },
                          valueAsNumber: true,
                        })} className={inputCls} placeholder="e.g. 28" />
                      </InputField>
                      <InputField label="Gender *" error={errors.gender?.message}>
                        <select {...register('gender', { required: 'Gender is required' })} className={inputCls}>
                          <option value="">Select...</option>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </InputField>
                    </div>
                    <InputField label="Mobile Number *" error={errors.mobile?.message}>
                      <input {...register('mobile', {
                        required: 'Mobile number is required',
                        pattern: { value: /^\+?[6-9][0-9]{9,14}$/, message: 'Enter a valid Indian mobile number (10 digits, starts with 6-9)' },
                      })} className={inputCls} placeholder="+91 98765 43210" />
                    </InputField>
                    <InputField label="Email Address *" error={errors.email?.message}>
                      <input type="email" {...register('email', {
                        required: 'Email address is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                        maxLength: { value: 100, message: 'Email is too long' },
                      })} className={inputCls} placeholder="you@example.com" />
                    </InputField>
                    <InputField label="Address *" error={errors.address?.message}>
                      <textarea {...register('address', {
                        required: 'Address is required',
                        minLength: { value: 10, message: 'Please enter your full address (min 10 characters)' },
                        maxLength: { value: 300, message: 'Address is too long (max 300 characters)' },
                      })} className={inputCls} rows={2} placeholder="House No., Street, City, District" />
                    </InputField>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-indigo-700 leading-relaxed">
                        Your personal information is encrypted and only used for profile creation and verification. It will never be shared publicly.
                      </p>
                    </div>
                  </>
                )}

                {/* ── Step 1: Job Details ── */}
                {step === 1 && (
                  <>
                    <InputField label="Job Type *" error={errors.jobType?.message}>
                      <select {...register('jobType', { required: 'Please select your job type' })} className={inputCls}>
                        <option value="">Select your trade...</option>
                        {JOB_TYPES.map(j => <option key={j}>{j}</option>)}
                      </select>
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Daily Rate (₹) *" error={errors.dailyRate?.message}>
                        <input type="number" {...register('dailyRate', {
                          required: 'Daily rate is required',
                          min: { value: 100, message: 'Minimum rate is ₹100' },
                          max: { value: 50000, message: 'Maximum rate is ₹50,000' },
                          valueAsNumber: true,
                        })} className={inputCls} />
                      </InputField>
                      <InputField label="Experience (years) *" error={errors.experienceYears?.message}>
                        <input type="number" {...register('experienceYears', {
                          required: 'Enter 0 if no experience',
                          min: { value: 0, message: 'Cannot be negative' },
                          max: { value: 50, message: 'Maximum 50 years' },
                          valueAsNumber: true,
                        })} className={inputCls} />
                      </InputField>
                    </div>
                    <InputField label="Current Location *" error={errors.currentLocation?.message}>
                      <select {...register('currentLocation', { required: 'Please select your current district' })} className={inputCls}>
                        <option value="">Select your district...</option>
                        {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Preferred District *" error={errors.district?.message}>
                        <select {...register('district', { required: 'Please select a preferred district' })} className={inputCls}>
                          <option value="">Select...</option>
                          {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </InputField>
                      <InputField label="Preferred Town *" error={errors.town?.message}>
                        <input {...register('town', {
                          required: 'Town is required',
                          minLength: { value: 2, message: 'Enter a valid town name' },
                          maxLength: { value: 60, message: 'Town name is too long' },
                        })} className={inputCls} placeholder="e.g. Kochi" />
                      </InputField>
                    </div>
                    <InputField label="Interested Locations *" error={errors.interestedLocations?.message}>
                      <input {...register('interestedLocations', {
                        required: 'Please list where you are willing to work',
                        minLength: { value: 3, message: 'Enter at least one location' },
                        maxLength: { value: 200, message: 'Too many characters (max 200)' },
                      })} className={inputCls} placeholder="e.g. Kochi, Ernakulam, Kakkanad" />
                    </InputField>
                    <InputField label="Additional Facilities (optional)">
                      <textarea {...register('facilitiesRequested', {
                        maxLength: { value: 200, message: 'Too many characters (max 200)' },
                      })} className={inputCls} rows={2} placeholder="e.g. Food, Accommodation, Travel allowance" />
                    </InputField>
                  </>
                )}

                {/* ── Step 2: Documents ── */}
                {step === 2 && (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">
                        All documents are stored with AES-256 encryption and used <strong>only for identity verification</strong>.
                        They are never visible to customers.
                      </p>
                    </div>
                    <FileDropzone label="Passbook Front Page *" hint="JPG, PNG or PDF · Max 5 MB"
                      accept={{ 'image/*': [], 'application/pdf': [] }} file={passbookFile} onFile={setPassbookFile} />
                    <FileDropzone label="Aadhaar Card *" hint="JPG, PNG or PDF · Max 5 MB"
                      accept={{ 'image/*': [], 'application/pdf': [] }} file={aadharFile} onFile={setAadharFile} />
                    <FileDropzone label="Passport-size Photo *" hint="JPG or PNG · Max 2 MB · Clear face visible"
                      accept={{ 'image/*': [] }} file={photoFile} onFile={setPhotoFile} />
                  </>
                )}

                {/* ── Step 3: Review ── */}
                {step === 3 && (
                  <>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900">Application Summary</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Please review before submitting</p>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {[
                          ['Full Name', values.name],
                          ['Age', values.age],
                          ['Gender', values.gender],
                          ['Mobile', values.mobile],
                          ['Email', values.email],
                          ['Address', values.address],
                          ['Job Type', values.jobType],
                          ['Daily Rate', `₹${values.dailyRate}`],
                          ['Experience', `${values.experienceYears} yrs`],
                          ['Current District', values.currentLocation],
                          ['Preferred District', values.district],
                          ['Preferred Town', values.town],
                          ['Interested Locations', values.interestedLocations],
                          ['Facilities', values.facilitiesRequested || 'None specified'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center px-6 py-3 text-sm">
                            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{k}</span>
                            <span className="font-semibold text-slate-900 text-right max-w-[55%]">{v}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-6 py-3 text-sm">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Documents</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> 3 Uploaded
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-sm text-emerald-800 font-medium">
                        Terms &amp; Conditions accepted
                      </span>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Navigation Buttons ── */}
            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-6 py-3.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-200 text-sm">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading || !termsAccepted}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 text-sm">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Submit Application</>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
