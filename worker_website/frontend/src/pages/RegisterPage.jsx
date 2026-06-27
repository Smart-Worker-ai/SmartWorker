import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  Upload, CheckCircle, ArrowLeft, ArrowRight, AlertCircle,
  User, Briefcase, FileText, ClipboardCheck, ShieldCheck, Lock, Star,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const DISTRICTS = [
  'Ernakulam','Thiruvananthapuram','Thrissur','Kozhikode','Kottayam',
  'Palakkad','Malappuram','Kollam','Kannur','Alappuzha','Idukki','Kasaragod','Pathanamthitta','Wayanad',
];
const JOB_TYPES = [
  'Electrician','Plumber','Carpenter','AC Technician','Painter',
  'Mason','Welder','Cleaner','Driver','Cook','Other',
];

const MAX_DOC_SIZE_MB   = 5;
const MAX_PHOTO_SIZE_MB = 2;

// Keep raw keys here — translate at render via t()
const STEPS = [
  { key: 'Personal Info', descKey: 'Tell us who you are',          icon: User },
  { key: 'Job Details',   descKey: 'Your skills & preferences',     icon: Briefcase },
  { key: 'Documents',     descKey: 'Verification documents',        icon: FileText },
  { key: 'Review',        descKey: 'Confirm & submit',              icon: ClipboardCheck },
];

function FileDropzone({ label, hint, accept, maxSizeMb, file, onFile, onError }) {
  const { isDark, t } = useTheme();
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    maxSize: maxSizeMb * 1024 * 1024,
    onDrop: (files, rejections) => {
      if (rejections && rejections.length) {
        const code = rejections[0].errors?.[0]?.code;
        if (code === 'file-too-large') {
          onError(`${label}: file is larger than ${maxSizeMb} MB.`);
        } else if (code === 'file-invalid-type') {
          onError(`${label}: file type not allowed.`);
        } else {
          onError(`${label}: could not accept this file.`);
        }
        return;
      }
      if (files[0]) onFile(files[0]);
    },
  });
  const idle = isDark
    ? 'border-gray-700 hover:border-indigo-400 hover:bg-gray-800/60 bg-gray-900'
    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 bg-white';
  const drag = isDark
    ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
    : 'border-indigo-400 bg-indigo-50 scale-[1.01]';
  const filled = isDark
    ? 'border-emerald-500 bg-emerald-950/30'
    : 'border-emerald-400 bg-emerald-50';
  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{label}</label>
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? drag : file ? filled : idle}`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className={`flex items-center justify-center gap-3 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-100'}`}>
              <CheckCircle className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{file.name}</p>
              <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {(file.size / 1024 / 1024).toFixed(2)} MB · {t ? t('ready') : 'ready'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-gray-800' : 'bg-slate-100'}`}>
              <Upload className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-slate-400'}`} />
            </div>
            <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              {isDragActive
                ? (t ? t('Release to upload') : 'Release to upload')
                : (t ? t('Drag & drop or click to browse') : 'Drag & drop or click to browse')}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InputField({ label, error, children }) {
  const { isDark } = useTheme();
  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{label}</label>
      {children}
      {error && (
        <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = (isDark) => `w-full border rounded-xl px-4 py-3.5 text-sm
  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
  transition-all duration-150 ${isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-800'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'}`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isDark, t } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // T&C is accepted explicitly on the Review step (before submit), NOT pre-set
  // from a prior page. Prevents accidental/auto submission.
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [passbookFile, setPassbookFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const { register, handleSubmit, formState: { errors }, trigger, getValues } = useForm({
    defaultValues: { gender: 'Male', dailyRate: 800, experienceYears: 0 },
  });

  // Intercept browser back to step backwards inside the form
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
    // Final guard — submit button is also disabled when terms aren't accepted
    if (!termsAccepted) { setError('Please accept the Terms & Conditions to submit.'); return; }
    if (!passbookFile || !aadharFile || !photoFile) {
      setError('Please upload all three documents.');
      setStep(2);
      return;
    }
    setLoading(true); setError('');
    try {
      // Normalize mobile: backend strips non-digits, so prefix +91 here.
      const mobile = `+91${String(data.mobile).replace(/\D/g, '').slice(-10)}`;

      const fd = new FormData();
      Object.entries({
        name: data.name.trim(),
        age: data.age,
        gender: data.gender,
        mobile,
        email: data.email.trim().toLowerCase(),
        address: (data.address || '').trim(),
        district: data.district,
        town: data.town.trim(),
        job_type: data.jobType,
        current_location: data.currentLocation,
        interested_locations: data.interestedLocations.trim(),
        facilities_requested: (data.facilitiesRequested || '').trim(),
        daily_rate: data.dailyRate,
        experience_years: data.experienceYears,
        accepted_terms: 'true',
      }).forEach(([k, v]) => fd.append(k, v));
      fd.append('passbook_photo', passbookFile);
      fd.append('aadhar_photo',   aadharFile);
      fd.append('profile_photo',  photoFile);

      await axios.post('/api/workers/register', fd, {
        // explicit timeout — Railway free-tier cold start can be slow
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/success');
    } catch (e) {
      let msg;
      if (e.code === 'ECONNABORTED') {
        msg = 'The server took too long to respond. Please try again in a moment.';
      } else if (e.response?.status === 409) {
        msg = e.response.data?.detail || 'This mobile number or email is already registered.';
      } else if (e.response?.data?.detail) {
        // FastAPI returns either a string or a list of validation errors
        const d = e.response.data.detail;
        msg = typeof d === 'string'
          ? d
          : Array.isArray(d)
            ? d.map(x => `${x.loc?.slice(-1)[0] ?? 'field'}: ${x.msg}`).join('; ')
            : 'Registration failed. Please review your details.';
      } else {
        msg = 'Could not reach the server. Check your connection and try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const values = getValues();
  const StepIcon = STEPS[step].icon;
  const onFileError = (m) => setError(m);

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden md:flex md:w-72 lg:w-80 bg-gradient-to-b from-slate-900 to-indigo-950 text-white flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-8 border-b border-white/10">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('Back')}
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-base">{t('Crewzo')}</p>
              <p className="text-xs text-white/50">{t('Worker Registration')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.key} className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200
                ${active ? 'bg-indigo-600 shadow-lg shadow-indigo-900/40' : done ? 'bg-white/5' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${active ? 'bg-white/20' : done ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {done ? <CheckCircle className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/70'}`}>{t(s.key)}</p>
                  <p className="text-xs text-white/40">{t(s.descKey)}</p>
                </div>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />}
              </div>
            );
          })}
        </nav>

        <div className="p-6 space-y-3 border-t border-white/10">
          {[
            { icon: ShieldCheck, text: t('Your data is safe') },
            { icon: Star,        text: t('Rated 4.7★ by workers') },
          ].map(({ icon: I, text }) => (
            <div key={text} className="flex items-center gap-3 text-white/50 text-xs">
              <I className="w-4 h-4 shrink-0" />{text}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Form Area ── */}
      <div className={`flex-1 flex flex-col min-h-screen ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>

        {/* Mobile header */}
        <header className={`md:hidden sticky top-0 z-10 px-4 h-14 flex items-center gap-3 border-b transition-colors
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'}`}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
              ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className={`font-bold flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('Worker Registration')}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
            ${isDark ? 'text-indigo-300 bg-indigo-900/40' : 'text-indigo-600 bg-indigo-50'}`}>
            {step + 1}/{STEPS.length}
          </span>
        </header>

        {/* Mobile progress bar */}
        <div className={`md:hidden border-b px-4 py-3 transition-colors
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300
                ${i < step ? 'bg-emerald-500' : i === step ? 'bg-indigo-600' : (isDark ? 'bg-gray-800' : 'bg-slate-100')}`} />
            ))}
          </div>
          <p className={`text-xs font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
            {t(STEPS[step].key)} — {t(STEPS[step].descKey)}
          </p>
        </div>

        {/* Form content */}
        <div className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-2xl w-full mx-auto">

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{t(STEPS[step].key)}</h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t(STEPS[step].descKey)}</p>
            </div>
          </div>

          {error && (
            <div className={`mb-6 border rounded-xl p-4 flex gap-3 text-sm ${isDark ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{error}
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault(); }}
          >
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
                className="space-y-5">

                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                  <>
                    <InputField label={`${t('Full Name')} *`} error={errors.name?.message}>
                      <input {...register('name', {
                        required: 'Full name is required',
                        minLength: { value: 2, message: 'Name must be at least 2 characters' },
                        maxLength: { value: 80, message: 'Name must be under 80 characters' },
                        pattern: { value: /^[a-zA-Z\s.'-]+$/, message: 'Name can only contain letters and spaces' },
                      })} className={inputCls(isDark)} placeholder="e.g. Suresh Kumar" />
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label={`${t('Age')} *`} error={errors.age?.message}>
                        <input type="number" {...register('age', {
                          required: 'Age is required',
                          min: { value: 18, message: 'Must be at least 18 years old' },
                          max: { value: 70, message: 'Must be under 70 years old' },
                          valueAsNumber: true,
                        })} className={inputCls(isDark)} placeholder="e.g. 28" />
                      </InputField>
                      <InputField label={`${t('Gender')} *`} error={errors.gender?.message}>
                        <select {...register('gender', { required: 'Gender is required' })} className={inputCls(isDark)}>
                          <option value="">{t('Select...')}</option>
                          <option value="Male">{t('Male')}</option>
                          <option value="Female">{t('Female')}</option>
                          <option value="Other">{t('Other')}</option>
                        </select>
                      </InputField>
                    </div>

                    {/* Mobile with fixed +91 prefix — eliminates the regex/placeholder mismatch */}
                    <InputField label={`${t('Mobile Number')} *`} error={errors.mobile?.message}>
                      <div className={`flex items-stretch rounded-xl overflow-hidden border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-slate-200 bg-slate-50'}`}>
                        <span className={`px-4 flex items-center text-sm font-semibold border-r ${isDark ? 'border-gray-700 text-gray-300' : 'border-slate-200 text-slate-600'}`}>
                          🇮🇳 +91
                        </span>
                        <input
                          inputMode="numeric"
                          maxLength={10}
                          {...register('mobile', {
                            required: 'Mobile number is required',
                            pattern: {
                              value: /^[6-9]\d{9}$/,
                              message: 'Enter a valid 10-digit Indian mobile (starts with 6-9)',
                            },
                          })}
                          onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); }}
                          className={`flex-1 px-4 py-3.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500
                            ${isDark ? 'bg-gray-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                          placeholder="9876543210"
                        />
                      </div>
                    </InputField>

                    <InputField label={`${t('Email Address')} *`} error={errors.email?.message}>
                      <input type="email" {...register('email', {
                        required: 'Email address is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
                        maxLength: { value: 100, message: 'Email is too long' },
                      })} className={inputCls(isDark)} placeholder="you@example.com" />
                    </InputField>
                    <InputField label={`${t('Address')} *`} error={errors.address?.message}>
                      <textarea {...register('address', {
                        required: 'Address is required',
                        minLength: { value: 10, message: 'Please enter your full address (min 10 characters)' },
                        maxLength: { value: 300, message: 'Address is too long (max 300 characters)' },
                      })} className={inputCls(isDark)} rows={2} placeholder={t('House No., Street, City, District')} />
                    </InputField>
                    <div className={`border rounded-xl p-4 flex gap-3 items-center transition-colors
                      ${isDark ? 'bg-indigo-950/40 border-indigo-900/60' : 'bg-indigo-50 border-indigo-100'}`}>
                      <ShieldCheck className={`w-5 h-5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                      <p className={`text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                        {t('Your details are private and will never be shared.')}
                      </p>
                    </div>
                  </>
                )}

                {/* ── Step 1: Job Details ── */}
                {step === 1 && (
                  <>
                    <InputField label={`${t('Job Type')} *`} error={errors.jobType?.message}>
                      <select {...register('jobType', { required: 'Please select your job type' })} className={inputCls(isDark)}>
                        <option value="">{t('Select your trade...')}</option>
                        {JOB_TYPES.map(j => <option key={j} value={j}>{t(j)}</option>)}
                      </select>
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label={`${t('Daily Rate (₹)')} *`} error={errors.dailyRate?.message}>
                        <input type="number" {...register('dailyRate', {
                          required: 'Daily rate is required',
                          min: { value: 100, message: 'Minimum rate is ₹100' },
                          max: { value: 50000, message: 'Maximum rate is ₹50,000' },
                          valueAsNumber: true,
                        })} className={inputCls(isDark)} />
                      </InputField>
                      <InputField label={`${t('Experience (years)')} *`} error={errors.experienceYears?.message}>
                        <input type="number" {...register('experienceYears', {
                          required: 'Enter 0 if no experience',
                          min: { value: 0, message: 'Cannot be negative' },
                          max: { value: 50, message: 'Maximum 50 years' },
                          valueAsNumber: true,
                        })} className={inputCls(isDark)} />
                      </InputField>
                    </div>
                    <InputField label={`${t('Current Location')} *`} error={errors.currentLocation?.message}>
                      <select {...register('currentLocation', { required: 'Please select your current district' })} className={inputCls(isDark)}>
                        <option value="">{t('Select your district...')}</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </InputField>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label={`${t('Preferred District')} *`} error={errors.district?.message}>
                        <select {...register('district', { required: 'Please select a preferred district' })} className={inputCls(isDark)}>
                          <option value="">{t('Select...')}</option>
                          {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </InputField>
                      <InputField label={`${t('Preferred Town')} *`} error={errors.town?.message}>
                        <input {...register('town', {
                          required: 'Town is required',
                          minLength: { value: 2, message: 'Enter a valid town name' },
                          maxLength: { value: 60, message: 'Town name is too long' },
                        })} className={inputCls(isDark)} placeholder="e.g. Kochi" />
                      </InputField>
                    </div>
                    <InputField label={`${t('Interested Locations')} *`} error={errors.interestedLocations?.message}>
                      <input {...register('interestedLocations', {
                        required: 'Please list where you are willing to work',
                        minLength: { value: 3, message: 'Enter at least one location' },
                        maxLength: { value: 200, message: 'Too many characters (max 200)' },
                      })} className={inputCls(isDark)} placeholder="e.g. Kochi, Ernakulam, Kakkanad" />
                    </InputField>
                    <InputField label={t('Additional Facilities (optional)')}>
                      <textarea {...register('facilitiesRequested', {
                        maxLength: { value: 200, message: 'Too many characters (max 200)' },
                      })} className={inputCls(isDark)} rows={2} placeholder="e.g. Food, Accommodation, Travel allowance" />
                    </InputField>
                  </>
                )}

                {/* ── Step 2: Documents ── */}
                {step === 2 && (
                  <>
                    <div className={`border rounded-xl p-4 flex gap-3 items-center transition-colors
                      ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200'}`}>
                      <Lock className={`w-5 h-5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                      <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                        {t('Your documents are safe and used only for verification.')}
                      </p>
                    </div>
                    <FileDropzone label={`${t('Passbook Front Page')} *`} hint={`JPG, PNG, PDF · Max ${MAX_DOC_SIZE_MB} MB`}
                      accept={{ 'image/*': [], 'application/pdf': [] }} maxSizeMb={MAX_DOC_SIZE_MB}
                      file={passbookFile} onFile={setPassbookFile} onError={onFileError} />
                    <FileDropzone label={`${t('Aadhaar Card')} *`} hint={`JPG, PNG, PDF · Max ${MAX_DOC_SIZE_MB} MB`}
                      accept={{ 'image/*': [], 'application/pdf': [] }} maxSizeMb={MAX_DOC_SIZE_MB}
                      file={aadharFile} onFile={setAadharFile} onError={onFileError} />
                    <FileDropzone label={`${t('Passport-size Photo')} *`} hint={`JPG, PNG · Max ${MAX_PHOTO_SIZE_MB} MB`}
                      accept={{ 'image/*': [] }} maxSizeMb={MAX_PHOTO_SIZE_MB}
                      file={photoFile} onFile={setPhotoFile} onError={onFileError} />
                  </>
                )}

                {/* ── Step 3: Review + T&C + Submit ── */}
                {step === 3 && (
                  <>
                    <div className={`border rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`}>
                      <div className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-100'}`}>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('Application Summary')}</h3>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t('Please review before submitting')}</p>
                      </div>
                      <div className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-slate-50'}`}>
                        {[
                          [t('Full Name'), values.name],
                          [t('Age'), values.age],
                          [t('Gender'), t(values.gender ?? '')],
                          [t('Mobile'), values.mobile ? `+91 ${values.mobile}` : '—'],
                          [t('Email'), values.email],
                          [t('Address'), values.address],
                          [t('Job Type'), t(values.jobType ?? '')],
                          [t('Daily Rate (₹)'), `₹${values.dailyRate}`],
                          [t('Experience'), `${values.experienceYears} ${t('year(s)')}`],
                          [t('Current Location'), values.currentLocation],
                          [t('Preferred District'), values.district],
                          [t('Preferred Town'), values.town],
                          [t('Interested Locations'), values.interestedLocations],
                          [t('Facilities Requested'), values.facilitiesRequested || t('— None specified —')],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center px-6 py-3 text-sm">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{k}</span>
                            <span className={`font-semibold text-right max-w-[55%] ${isDark ? 'text-white' : 'text-slate-900'}`}>{v}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-6 py-3 text-sm">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{t('Documents')}</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> 3 {t('Uploaded')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── T&C: explicit checkbox just before submit ── */}
                    <div className={`mt-2 rounded-2xl border p-5 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-200'}`}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-5 h-5 accent-indigo-600 shrink-0"
                        />
                        <span className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                          {t('I have read and agree to the')}{' '}
                          <button
                            type="button"
                            onClick={() => window.open('/terms', '_blank', 'noopener,noreferrer')}
                            className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
                          >
                            {t('Terms & Conditions')}
                          </button>
                          {t('. I confirm all the details above are accurate and the documents I uploaded are genuine.')}
                        </span>
                      </label>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ── Navigation Buttons ── */}
            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)}
                  className={`flex items-center gap-2 px-6 py-3.5 border font-semibold rounded-xl transition-colors text-sm ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <ArrowLeft className="w-4 h-4" /> {t('Back')}
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 text-sm">
                  {t('Continue')} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  title={!termsAccepted ? 'Accept the Terms & Conditions to enable submit' : ''}
                  className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 text-sm
                    ${isDark
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white'
                    }`}>
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('Submitting…')}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> {t('Submit Application')}</>
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
