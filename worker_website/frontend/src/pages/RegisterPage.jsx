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

// Current residence can be anywhere in Kerala; work area is Kozhikode-only for now.
const DISTRICTS = [
  'Ernakulam','Thiruvananthapuram','Thrissur','Kozhikode','Kottayam',
  'Palakkad','Malappuram','Kollam','Kannur','Alappuzha','Idukki','Kasaragod','Pathanamthitta','Wayanad',
];

const SERVICE_DISTRICT = 'Kozhikode';

const KOZHIKODE_TOWNS = [
  'Kozhikode City', 'Vatakara', 'Koyilandy', 'Feroke', 'Ramanattukara',
  'Mukkam', 'Kunnamangalam', 'Balussery', 'Thamarassery', 'Perambra',
  'Nadapuram', 'Payyoli', 'Beypore', 'Elathur', 'Koduvally',
  'Mavoor', 'Pantheerankavu', 'West Hill', 'Kallai', 'Meenchanda',
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
    ? 'border-gray-700 hover:border-brand-400 hover:bg-gray-800/60 bg-gray-900'
    : 'border-gray-300 hover:border-brand-400 hover:bg-gray-100 bg-white';
  const drag = isDark
    ? 'border-brand-400 bg-brand-950/40 scale-[1.01]'
    : 'border-brand-400 bg-brand-50 scale-[1.01]';
  const filled = isDark
    ? 'border-emerald-500 bg-emerald-950/30'
    : 'border-emerald-400 bg-emerald-50';
  return (
    <div>
      <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
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
      <label className={`block text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>{label}</label>
      {children}
      {error && (
        <p className="text-red-600 text-xs mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = (isDark) => `w-full border rounded-xl px-4 py-3.5 text-sm
  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
  transition-all duration-150 ${isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:bg-gray-800'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:ring-brand-100'}`;

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

  const [registrationType, setRegistrationType] = useState('worker');
  const [jobTypes, setJobTypes] = useState([]);

  const { register, handleSubmit, formState: { errors }, trigger, getValues } = useForm({
    defaultValues: {
      gender: 'Male',
      dailyRate: 800,
      experienceYears: 0,
      numWorkers: 1,
      district: SERVICE_DISTRICT,
      interestedLocations: [],
    },
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

  // Fetch job types on mount
  useEffect(() => {
    const fetchJobTypes = async () => {
      try {
        const response = await axios.get('/api/workers/job-types');
        setJobTypes(response.data?.job_types || []);
      } catch (e) {
        console.error('Failed to fetch job types:', e);
        setJobTypes([]);
      }
    };
    fetchJobTypes();
  }, []);

  const STEP_FIELDS = [
    ['name', 'age', 'gender', 'mobile', 'email', 'address'],
    ['jobType', 'currentLocation', 'district', 'town', 'interestedLocations', 'dailyRate', 'experienceYears', ...(registrationType === 'agent' ? ['numWorkers'] : [])],
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
      const formEntries = {
        name: data.name.trim(),
        age: data.age,
        gender: data.gender,
        mobile,
        email: data.email.trim().toLowerCase(),
        address: (data.address || '').trim(),
        district: SERVICE_DISTRICT,
        town: data.town.trim(),
        job_type: data.jobType,
        current_location: data.currentLocation,
        interested_locations: (Array.isArray(data.interestedLocations)
          ? data.interestedLocations
          : [data.interestedLocations].filter(Boolean)
        ).join(', '),
        facilities_requested: (data.facilitiesRequested || '').trim(),
        daily_rate: data.dailyRate,
        experience_years: data.experienceYears,
        registration_type: registrationType,
        accepted_terms: 'true',
      };
      if (registrationType === 'agent') {
        formEntries.num_workers = data.numWorkers;
      }
      Object.entries(formEntries).forEach(([k, v]) => fd.append(k, v));
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
      <aside className="hidden md:flex md:w-72 lg:w-80 bg-gradient-to-b from-brand-600 to-brand-700 text-white flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-8 border-b border-white/20">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('Back')}
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg text-white">{t('Crewzo')}</p>
              <p className="text-xs text-brand-100">{t('Worker Registration')}</p>
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
                ${active ? 'bg-white/20' : done ? 'bg-transparent' : 'bg-transparent'} hover:bg-white/10`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                  ${active ? 'bg-white text-brand-600' : done ? 'bg-emerald-500 text-white' : 'text-brand-100'}`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${active ? 'text-white font-bold' : 'text-brand-50'}`}>{t(s.key)}</p>
                  <p className={`text-xs ${active ? 'text-brand-100 opacity-70' : 'text-brand-50 opacity-60'}`}>{t(s.descKey)}</p>
                </div>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            );
          })}
        </nav>

        <div className="p-6 space-y-3 border-t border-white/20">
          {[
            { icon: ShieldCheck, text: t('Your data is safe') },
            { icon: Star,        text: t('Rated 4.7★ by workers') },
          ].map(({ icon: I, text }) => (
            <div key={text} className="flex items-center gap-3 text-brand-100 text-xs">
              <I className="w-4 h-4 shrink-0" />{text}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main Form Area ── */}
      <div className={`flex-1 flex flex-col min-h-screen ${isDark ? 'bg-gray-950' : 'bg-slate-50'}`}>

        {/* Mobile header */}
        <header className={`md:hidden sticky top-0 z-10 px-4 h-14 flex items-center gap-3 border-b transition-colors
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
              ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-700'}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className={`font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('Worker Registration')}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
            ${isDark ? 'text-brand-300 bg-brand-800/40' : 'text-brand-700 bg-brand-100'}`}>
            {step + 1}/{STEPS.length}
          </span>
        </header>

        {/* Mobile progress bar */}
        <div className={`md:hidden border-b px-4 py-3 transition-colors
          ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {STEPS.map((s, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300
                ${i < step ? 'bg-emerald-500' : i === step ? 'bg-brand-600' : (isDark ? 'bg-gray-800' : 'bg-gray-200')}`} />
            ))}
          </div>
          <p className={`text-xs font-semibold ${isDark ? 'text-brand-300' : 'text-brand-600'}`}>
            {t(STEPS[step].key)} — {t(STEPS[step].descKey)}
          </p>
        </div>

        {/* Form content */}
        <div className="flex-1 px-4 sm:px-8 py-6 sm:py-10 max-w-2xl w-full mx-auto">

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
              <StepIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{t(STEPS[step].key)}</h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t(STEPS[step].descKey)}</p>
            </div>
          </div>

          {error && (
            <div className={`mb-6 border rounded-xl p-4 flex gap-3 text-sm ${isDark ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{error}
            </div>
          )}

          {step === 0 && (
            <div className="mb-8 pb-6 border-b">
              <label className={`block text-xs font-semibold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                {t('Registration Type')} *
              </label>
              <div className="flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setRegistrationType('worker')}
                  className={`flex-1 py-3.5 px-4 rounded-xl border-2 font-semibold transition-all text-sm flex items-center justify-center gap-2
                    ${registrationType === 'worker'
                      ? isDark ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-200'
                      : isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}>
                  <User className="w-4 h-4" /> {t('Worker')}
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationType('agent')}
                  className={`flex-1 py-3.5 px-4 rounded-xl border-2 font-semibold transition-all text-sm flex items-center justify-center gap-2
                    ${registrationType === 'agent'
                      ? isDark ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-200'
                      : isDark ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}>
                  <Briefcase className="w-4 h-4" /> {t('Agent')}
                </button>
              </div>
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
                      <div className={`flex items-stretch rounded-xl overflow-hidden border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-gray-50'}`}>
                        <span className={`px-4 flex items-center text-sm font-semibold border-r ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-300 text-gray-700'}`}>
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
                          className={`flex-1 px-4 py-3.5 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500
                            ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-900'}`}
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
                      ${isDark ? 'bg-brand-950/40 border-brand-800/60' : 'bg-blue-50 border-blue-200'}`}>
                      <ShieldCheck className={`w-5 h-5 shrink-0 ${isDark ? 'text-brand-400' : 'text-blue-600'}`} />
                      <p className={`text-xs font-medium ${isDark ? 'text-brand-300' : 'text-blue-700'}`}>
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
                        {jobTypes.map(j => <option key={j} value={j}>{t(j)}</option>)}
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
                      <InputField label={`${t('Preferred District')} *`}>
                        <input type="hidden" {...register('district')} />
                        <div className={`${inputCls(isDark)} flex items-center cursor-default opacity-90`}>
                          {SERVICE_DISTRICT}
                          <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-brand-300' : 'text-brand-600'}`}>
                            {t('Service area')}
                          </span>
                        </div>
                      </InputField>
                      <InputField label={`${t('Preferred Town')} *`} error={errors.town?.message}>
                        <select {...register('town', { required: 'Please select a preferred town' })} className={inputCls(isDark)}>
                          <option value="">{t('Select town...')}</option>
                          {KOZHIKODE_TOWNS.map(town => (
                            <option key={town} value={town}>{town}</option>
                          ))}
                        </select>
                      </InputField>
                    </div>
                    <InputField label={`${t('Interested Locations')} *`} error={errors.interestedLocations?.message}>
                      <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('Select towns in Kozhikode where you are willing to work.')}
                      </p>
                      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-xl border p-3 ${
                        isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-300 bg-gray-50'
                      }`}>
                        {KOZHIKODE_TOWNS.map(town => (
                          <label
                            key={town}
                            className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 transition-colors ${
                              isDark ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-white text-gray-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={town}
                              {...register('interestedLocations', {
                                validate: (v) =>
                                  (Array.isArray(v) ? v.length > 0 : !!v) || 'Select at least one location',
                              })}
                              className="rounded border-gray-400 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="leading-tight">{town}</span>
                          </label>
                        ))}
                      </div>
                    </InputField>
                    {registrationType === 'agent' && (
                      <InputField label={`${t('Number of Workers')} *`} error={errors.numWorkers?.message}>
                        <input type="number" {...register('numWorkers', {
                          required: 'Please specify number of workers',
                          min: { value: 1, message: 'Must have at least 1 worker' },
                          max: { value: 1000, message: 'Maximum 1000 workers' },
                          valueAsNumber: true,
                        })} className={inputCls(isDark)} placeholder="e.g. 5" />
                      </InputField>
                    )}
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
                      <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
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
                    <div className={`border rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('Application Summary')}</h3>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('Please review before submitting')}</p>
                      </div>
                      <div className={`divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-100'}`}>
                        {[
                          [t('Full Name'), values.name],
                          [t('Age'), values.age],
                          [t('Gender'), t(values.gender ?? '')],
                          [t('Mobile'), values.mobile ? `+91 ${values.mobile}` : '—'],
                          [t('Email'), values.email],
                          [t('Address'), values.address],
                          [t('Registration Type'), registrationType === 'worker' ? t('Worker') : t('Agent')],
                          [t('Job Type'), t(values.jobType ?? '')],
                          [t('Daily Rate (₹)'), `₹${values.dailyRate}`],
                          [t('Experience'), `${values.experienceYears} ${t('year(s)')}`],
                          ...(registrationType === 'agent' ? [[t('Number of Workers'), values.numWorkers]] : []),
                          [t('Current Location'), values.currentLocation],
                          [t('Preferred District'), values.district || SERVICE_DISTRICT],
                          [t('Preferred Town'), values.town],
                          [t('Interested Locations'), Array.isArray(values.interestedLocations)
                            ? values.interestedLocations.join(', ')
                            : values.interestedLocations],
                          [t('Facilities Requested'), values.facilitiesRequested || t('— None specified —')],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between items-center px-6 py-3 text-sm">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{k}</span>
                            <span className={`font-semibold text-right max-w-[55%] ${isDark ? 'text-white' : 'text-gray-900'}`}>{v}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-6 py-3 text-sm">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('Documents')}</span>
                          <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <CheckCircle className="w-4 h-4" /> 3 {t('Uploaded')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── T&C: explicit checkbox just before submit ── */}
                    <div className={`mt-2 rounded-2xl border p-5 ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-0.5 w-5 h-5 accent-brand-600 shrink-0"
                        />
                        <span className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {t('I have read and agree to the')}{' '}
                          <button
                            type="button"
                            onClick={() => window.open('/terms', '_blank', 'noopener,noreferrer')}
                            className="text-brand-600 hover:text-brand-700 underline font-semibold"
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
                  className={`flex items-center gap-2 px-6 py-3.5 border font-semibold rounded-xl transition-colors text-sm ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                  <ArrowLeft className="w-4 h-4" /> {t('Back')}
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={nextStep}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 text-sm">
                  {t('Continue')} <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  title={!termsAccepted ? 'Accept the Terms & Conditions to enable submit' : ''}
                  className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-200 text-sm
                    ${isDark
                      ? 'bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white'
                      : 'bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white'
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
