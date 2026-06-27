import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// ── Translation dictionary (Malayalam) ────────────────────────────────────────
// Use the EXACT English string as the key. Keep keys short and unique.
// Fallback: if a key isn't in ML, render the English key as-is.
const ML = {
  // ── Brand / Common ──
  'Crewzo': 'സ്മാർട്ട് വർക്കേഴ്സ്',
  'Worker Registration': 'തൊഴിലാളി രജിസ്ട്രേഷൻ',
  'Join Now': 'ഇപ്പോൾ ചേരുക',
  'Logout': 'ലോഗൗട്ട്',
  'Back': 'പിന്നോട്ട്',
  'Continue': 'തുടരുക',
  'Submit': 'സമർപ്പിക്കുക',
  'Cancel': 'റദ്ദാക്കുക',
  'Loading': 'ലോഡുചെയ്യുന്നു',
  'Settings': 'ക്രമീകരണങ്ങൾ',
  'Light Mode': 'ലൈറ്റ് മോഡ്',
  'Dark Mode': 'ഡാർക്ക് മോഡ്',
  'Language': 'ഭാഷ',
  'Switch to English': 'ഇംഗ്ലീഷിലേക്ക് മാറുക',
  'Switch to മലയാളം': 'മലയാളത്തിലേക്ക് മാറുക',
  'None': 'ഒന്നുമില്ല',
  '— None specified —': '— ഒന്നും വ്യക്തമാക്കിയിട്ടില്ല —',

  // ── Landing page ──
  "Kerala's #1 Skilled Worker Platform": "കേരളത്തിലെ #1 വൈദഗ്ധ്യമുള്ള തൊഴിലാളി പ്ലാറ്റ്ഫോം",
  'Your Skills,': 'നിങ്ങളുടെ വൈദഗ്ധ്യം,',
  'Your Income': 'നിങ്ങളുടെ വരുമാനം',
  'Join thousands of skilled tradespeople across Kerala earning more by connecting directly with customers who need your expertise.':
    'നിങ്ങളുടെ വൈദഗ്ധ്യം ആവശ്യമുള്ള ഉപഭോക്താക്കളുമായി നേരിട്ട് ബന്ധപ്പെട്ട് കൂടുതൽ വരുമാനം നേടുന്ന കേരളത്തിലെ ആയിരക്കണക്കിന് വൈദഗ്ധ്യമുള്ള തൊഴിലാളികളോടൊപ്പം ചേരുക.',
  'Register as Worker': 'തൊഴിലാളിയായി രജിസ്റ്റർ ചെയ്യുക',
  'Read T&C': 'നിബന്ധനകൾ വായിക്കുക',
  "Register Now — It's Free": 'ഇപ്പോൾ രജിസ്റ്റർ ചെയ്യൂ — സൗജന്യമാണ്',
  'Registered Workers': 'രജിസ്റ്റർ ചെയ്ത തൊഴിലാളികൾ',
  'Services Completed': 'പൂർത്തിയാക്കിയ സേവനങ്ങൾ',
  'Districts Covered': 'ഉൾപ്പെടുത്തിയ ജില്ലകൾ',
  'Avg. Rating': 'ശരാശരി റേറ്റിംഗ്',
  'We cover all trades': 'ഞങ്ങൾ എല്ലാ ട്രേഡുകളും കൈകാര്യം ചെയ്യുന്നു',
  'From electrical to painting — if you have a skill, we have customers.':
    'ഇലക്ട്രിക്കൽ മുതൽ പെയിന്റിംഗ് വരെ — നിങ്ങൾക്ക് വൈദഗ്ധ്യമുണ്ടെങ്കിൽ, ഞങ്ങൾക്ക് ഉപഭോക്താക്കളുണ്ട്.',
  'How it works': 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു',
  'Get hired in 3 simple steps': '3 ലളിതമായ ഘട്ടങ്ങളിൽ ജോലി നേടുക',
  'Register': 'രജിസ്റ്റർ ചെയ്യുക',
  'Fill your details, upload your documents and submit.': 'നിങ്ങളുടെ വിശദാംശങ്ങൾ പൂരിപ്പിച്ച്, രേഖകൾ അപ്‌ലോഡ് ചെയ്ത് സമർപ്പിക്കുക.',
  'Get Verified': 'പരിശോധിക്കപ്പെടുക',
  'Our team reviews your profile within 24 hours.': 'ഞങ്ങളുടെ ടീം 24 മണിക്കൂറിനുള്ളിൽ നിങ്ങളുടെ പ്രൊഫൈൽ അവലോകനം ചെയ്യും.',
  'Get Hired': 'ജോലി നേടുക',
  'Customers in your area can find and book you instantly.': 'നിങ്ങളുടെ പ്രദേശത്തെ ഉപഭോക്താക്കൾക്ക് നിങ്ങളെ കണ്ടെത്താനും തൽക്ഷണം ബുക്ക് ചെയ്യാനും കഴിയും.',
  'Why Crewzo?': 'എന്തുകൊണ്ട് സ്മാർട്ട് വർക്കേഴ്സ്?',
  'Earn More': 'കൂടുതൽ സമ്പാദിക്കൂ',
  'Set your own daily rate. No middlemen. Keep 100% of what you earn.':
    'നിങ്ങളുടെ സ്വന്തം ദിവസ നിരക്ക് സജ്ജമാക്കുക. ഇടനിലക്കാർ ഇല്ല. നിങ്ങൾ സമ്പാദിക്കുന്നതിന്റെ 100% നിങ്ങൾക്കുള്ളതാണ്.',
  'Verified Profile': 'പരിശോധിച്ച പ്രൊഫൈൽ',
  'Once verified, customers trust you. A badge that builds your reputation.':
    'ഒരിക്കൽ പരിശോധിച്ചാൽ, ഉപഭോക്താക്കൾ നിങ്ങളെ വിശ്വസിക്കും. നിങ്ങളുടെ പ്രശസ്തി കെട്ടിപ്പടുക്കുന്ന ഒരു ബാഡ്ജ്.',
  'Work Nearby': 'അടുത്തുള്ള ജോലികൾ',
  'Choose which districts and towns you want to work in. No long commutes.':
    'നിങ്ങൾക്ക് ജോലി ചെയ്യാൻ താൽപ്പര്യമുള്ള ജില്ലകളും പട്ടണങ്ങളും തിരഞ്ഞെടുക്കുക. ദീർഘദൂര യാത്രകളില്ല.',
  'Ready to start earning?': 'സമ്പാദിക്കാൻ തയ്യാറാണോ?',
  'Join Crewzo today. Registration takes less than 5 minutes.':
    'ഇന്നുതന്നെ സ്മാർട്ട് വർക്കേഴ്സിൽ ചേരുക. രജിസ്ട്രേഷൻ 5 മിനിറ്റിൽ താഴെ മാത്രമേ എടുക്കൂ.',
  '© 2026 Crewzo. All rights reserved. | Kerala, India':
    '© 2026 സ്മാർട്ട് വർക്കേഴ്സ്. എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം. | കേരളം, ഇന്ത്യ',
  'Terms & Conditions': 'നിബന്ധനകളും വ്യവസ്ഥകളും',

  // ── Trades ──
  'Electrician': 'ഇലക്ട്രീഷ്യൻ',
  'Plumber': 'പ്ലംബർ',
  'Carpenter': 'മരപ്പണിക്കാരൻ',
  'AC Technician': 'എസി ടെക്നീഷ്യൻ',
  'Painter': 'പെയിന്റർ',
  'Mason': 'മേസൺ',
  'Welder': 'വെൽഡർ',
  'More...': 'കൂടുതൽ...',

  // ── Register page (steps + UI) ──
  'Personal Info': 'വ്യക്തിഗത വിവരങ്ങൾ',
  'Job Details': 'ജോലി വിവരങ്ങൾ',
  'Documents': 'രേഖകൾ',
  'Review': 'അവലോകനം',
  'Tell us who you are': 'നിങ്ങളെപ്പറ്റി പറയൂ',
  'Your skills & preferences': 'നിങ്ങളുടെ വൈദഗ്ധ്യവും മുൻഗണനകളും',
  'Verification documents': 'പരിശോധന രേഖകൾ',
  'Confirm & submit': 'സ്ഥിരീകരിച്ച് സമർപ്പിക്കുക',
  'Your data is safe': 'നിങ്ങളുടെ ഡാറ്റ സുരക്ഷിതമാണ്',
  'Rated 4.7★ by workers': 'തൊഴിലാളികളാൽ 4.7★ റേറ്റിംഗ്',
  'Submitting…': 'സമർപ്പിക്കുന്നു…',
  'Submit Application': 'അപേക്ഷ സമർപ്പിക്കുക',
  'Full Name': 'പൂർണ്ണ നാമം',
  'Age': 'പ്രായം',
  'Gender': 'ലിംഗം',
  'Male': 'പുരുഷൻ',
  'Female': 'സ്ത്രീ',
  'Other': 'മറ്റുള്ളവ',
  'Select...': 'തിരഞ്ഞെടുക്കുക...',
  'Mobile Number': 'മൊബൈൽ നമ്പർ',
  'Email Address': 'ഇമെയിൽ വിലാസം',
  'Address': 'വിലാസം',
  'House No., Street, City, District': 'വീട് നം., തെരുവ്, നഗരം, ജില്ല',
  'Your details are private and will never be shared.': 'നിങ്ങളുടെ വിശദാംശങ്ങൾ സ്വകാര്യമാണ്, ഒരിക്കലും പങ്കിടില്ല.',
  'Job Type': 'ജോലി തരം',
  'Select your trade...': 'നിങ്ങളുടെ ട്രേഡ് തിരഞ്ഞെടുക്കുക...',
  'Daily Rate (₹)': 'ദിവസ നിരക്ക് (₹)',
  'Experience (years)': 'അനുഭവം (വർഷങ്ങൾ)',
  'Current Location': 'നിലവിലെ സ്ഥലം',
  'Select your district...': 'നിങ്ങളുടെ ജില്ല തിരഞ്ഞെടുക്കുക...',
  'Preferred District': 'ഇഷ്ടപ്പെട്ട ജില്ല',
  'Preferred Town': 'ഇഷ്ടപ്പെട്ട പട്ടണം',
  'Interested Locations': 'താൽപ്പര്യമുള്ള സ്ഥലങ്ങൾ',
  'Additional Facilities (optional)': 'അധിക സൗകര്യങ്ങൾ (ഓപ്ഷണൽ)',
  'Your documents are safe and used only for verification.':
    'നിങ്ങളുടെ രേഖകൾ സുരക്ഷിതമാണ്, പരിശോധനയ്ക്ക് മാത്രമേ ഉപയോഗിക്കൂ.',
  'Passbook Front Page': 'പാസ്ബുക്ക് ഫ്രണ്ട് പേജ്',
  'Aadhaar Card': 'ആധാർ കാർഡ്',
  'Passport-size Photo': 'പാസ്പോർട്ട് സൈസ് ഫോട്ടോ',
  'Drag & drop or click to browse': 'ഇവിടെ ഇടുക അല്ലെങ്കിൽ ബ്രൗസ് ചെയ്യാൻ ക്ലിക്ക് ചെയ്യുക',
  'Release to upload': 'അപ്‌ലോഡ് ചെയ്യാൻ വിടുക',
  'ready': 'തയ്യാർ',
  'Application Summary': 'അപേക്ഷ സംഗ്രഹം',
  'Please review before submitting': 'സമർപ്പിക്കുന്നതിന് മുമ്പ് അവലോകനം ചെയ്യുക',
  'Uploaded': 'അപ്‌ലോഡ് ചെയ്തു',
  'I have read and agree to the': 'ഞാൻ വായിച്ച് ഇതിനോട് സമ്മതിക്കുന്നു',
  '. I confirm all the details above are accurate and the documents I uploaded are genuine.':
    '. മുകളിലുള്ള എല്ലാ വിശദാംശങ്ങളും കൃത്യമാണെന്നും ഞാൻ അപ്‌ലോഡ് ചെയ്ത രേഖകൾ യഥാർത്ഥമാണെന്നും ഞാൻ സ്ഥിരീകരിക്കുന്നു.',

  // ── Success page ──
  "You're Registered!": 'നിങ്ങൾ രജിസ്റ്റർ ചെയ്തു!',
  'Your application has been submitted. Our team will review your documents and verify your profile within':
    'നിങ്ങളുടെ അപേക്ഷ സമർപ്പിച്ചു. ഞങ്ങളുടെ ടീം നിങ്ങളുടെ രേഖകൾ അവലോകനം ചെയ്ത് നിങ്ങളുടെ പ്രൊഫൈൽ പരിശോധിക്കും',
  '24 hours': '24 മണിക്കൂറിനുള്ളിൽ',
  'Verification takes 24–48 hours': 'പരിശോധന 24–48 മണിക്കൂർ എടുക്കും',
  "You'll receive an email when your profile is approved": 'നിങ്ങളുടെ പ്രൊഫൈൽ അംഗീകരിക്കുമ്പോൾ നിങ്ങൾക്ക് ഒരു ഇമെയിൽ ലഭിക്കും',
  'Once verified, customers can find and book you': 'ഒരിക്കൽ പരിശോധിച്ചാൽ, ഉപഭോക്താക്കൾക്ക് നിങ്ങളെ കണ്ടെത്താനും ബുക്ക് ചെയ്യാനും കഴിയും',

  // ── Dashboard ──
  'Verification Pending': 'പരിശോധന കാത്തിരിക്കുന്നു',
  'Verification pending message':
    'ഞങ്ങളുടെ ടീം നിങ്ങളുടെ രേഖകൾ അവലോകനം ചെയ്യുന്നു. പരിശോധന പൂർത്തിയാകുമ്പോൾ നിങ്ങളെ അറിയിക്കും (24–48 മണിക്കൂർ).',
  'Rating': 'റേറ്റിംഗ്',
  'Reviews': 'അവലോകനങ്ങൾ',
  'District': 'ജില്ല',
  'Profile Details': 'പ്രൊഫൈൽ വിവരങ്ങൾ',
  'Mobile': 'മൊബൈൽ',
  'Email': 'ഇമെയിൽ',
  'Experience': 'അനുഭവം',
  'Facilities Requested': 'അഭ്യർത്ഥിച്ച സൗകര്യങ്ങൾ',
  'year(s)': 'വർഷം',
  'New': 'പുതിയത്',
  '/day': '/ദിവസം',

  // ── Terms page ──
  'Crewzo Worker Terms': 'സ്മാർട്ട് വർക്കേഴ്സ് തൊഴിലാളി നിബന്ധനകൾ',
  'Last updated: April 2026': 'അവസാന അപ്‌ഡേറ്റ്: ഏപ്രിൽ 2026',
  'Continue to Registration': 'രജിസ്ട്രേഷനിലേക്ക് തുടരുക',
  'You will confirm acceptance on the final step of the registration form.':
    'രജിസ്ട്രേഷൻ ഫോമിന്റെ അവസാന ഘട്ടത്തിൽ നിങ്ങൾ സ്വീകാര്യത സ്ഥിരീകരിക്കും.',
  '1. Acceptance': '1. സ്വീകാര്യത',
  'By registering on Crewzo, you agree to these Terms & Conditions. If you do not agree, do not register.':
    'സ്മാർട്ട് വർക്കേഴ്സിൽ രജിസ്റ്റർ ചെയ്യുന്നതിലൂടെ, ഈ നിബന്ധനകളും വ്യവസ്ഥകളും അംഗീകരിക്കുന്നു. സമ്മതിക്കുന്നില്ലെങ്കിൽ, രജിസ്റ്റർ ചെയ്യരുത്.',
  '2. Eligibility': '2. യോഗ്യത',
  'You must be at least 18 years of age and a resident of India. You must possess the skills you claim to offer.':
    'നിങ്ങൾ കുറഞ്ഞത് 18 വയസ്സ് പ്രായമുള്ളവരും ഇന്ത്യൻ നിവാസിയും ആയിരിക്കണം. നിങ്ങൾ അവകാശപ്പെടുന്ന വൈദഗ്ധ്യങ്ങൾ കൈവശം വയ്ക്കണം.',
  '3. Document Verification': '3. രേഖ പരിശോധന',
  'You must upload genuine documents (Aadhaar card, passbook). Submitting false documents will result in immediate termination and may lead to legal action.':
    'യഥാർത്ഥ രേഖകൾ (ആധാർ, പാസ്ബുക്ക്) അപ്‌ലോഡ് ചെയ്യണം. വ്യാജ രേഖകൾ സമർപ്പിച്ചാൽ ഉടനടി കണക്ഷൻ റദ്ദാക്കും; നിയമപരമായ നടപടികളിലേക്ക് നയിച്ചേക്കാം.',
  '4. Code of Conduct': '4. പെരുമാറ്റച്ചട്ടം',
  'Workers must maintain professional conduct at all times. Harassment, fraud, or unprofessional behavior will result in permanent account suspension.':
    'തൊഴിലാളികൾ എപ്പോഴും പ്രൊഫഷണൽ പെരുമാറ്റം നിലനിർത്തണം. ഉപദ്രവം, വഞ്ചന അല്ലെങ്കിൽ പ്രൊഫഷണലല്ലാത്ത പെരുമാറ്റം സ്ഥിരമായ അക്കൗണ്ട് സസ്പെൻഷനിലേക്ക് നയിക്കും.',
  '5. Payments & Rates': '5. പേയ്മെന്റും നിരക്കുകളും',
  'Crewzo facilitates connections. Customers pay based on your listed daily rate. Crewzo does not deduct any commission — you keep 100% of the agreed amount.':
    'സ്മാർട്ട് വർക്കേഴ്സ് ബന്ധങ്ങൾ സുഗമമാക്കുന്നു. നിങ്ങളുടെ ദിവസ നിരക്ക് അനുസരിച്ച് ഉപഭോക്താക്കൾ പണം നൽകുന്നു. സ്മാർട്ട് വർക്കേഴ്സ് കമ്മീഷൻ ഈടാക്കുന്നില്ല — 100% നിങ്ങൾക്കുള്ളതാണ്.',
  '6. Availability': '6. ലഭ്യത',
  'You are responsible for keeping your availability accurate. Repeated no-shows to confirmed bookings will result in account suspension.':
    'നിങ്ങളുടെ ലഭ്യത കൃത്യമായി നിലനിർത്തുന്നതിന് നിങ്ങൾ ഉത്തരവാദിയാണ്. സ്ഥിരീകരിച്ച ബുക്കിംഗുകൾക്ക് ആവർത്തിച്ച് ഹാജരാകാതിരുന്നാൽ അക്കൗണ്ട് സസ്പെൻഷനിലേക്ക് നയിക്കും.',
  '7. Facilities & Requests': '7. സൗകര്യങ്ങളും അഭ്യർത്ഥനകളും',
  'Facility requests (food, accommodation, etc.) are requests only. Customers are not obligated to provide them. Disputes regarding facilities must be reported through the app.':
    'സൗകര്യ അഭ്യർത്ഥനകൾ (ഭക്ഷണം, താമസം മുതലായവ) വെറും അഭ്യർത്ഥനകൾ മാത്രമാണ്. അവ നൽകാൻ ഉപഭോക്താക്കൾ ബാധ്യസ്ഥരല്ല. തർക്കങ്ങൾ ആപ്പ് വഴി റിപ്പോർട്ട് ചെയ്യണം.',
  '8. Privacy': '8. സ്വകാര്യത',
  'Your Aadhaar and passbook documents are stored securely and used only for identity verification. They are not shared with third parties or customers.':
    'നിങ്ങളുടെ ആധാർ, പാസ്ബുക്ക് രേഖകൾ സുരക്ഷിതമായി സൂക്ഷിക്കുകയും ഐഡന്റിറ്റി പരിശോധനയ്ക്ക് മാത്രം ഉപയോഗിക്കുകയും ചെയ്യും. മൂന്നാം കക്ഷികളുമായോ ഉപഭോക്താക്കളുമായോ പങ്കിടില്ല.',
  '9. Account Suspension': '9. അക്കൗണ്ട് സസ്പെൻഷൻ',
  'Crewzo reserves the right to suspend or permanently block accounts for violations of these terms, fraudulent activity, or upon receiving substantiated complaints.':
    'ഈ നിബന്ധനകൾ ലംഘിക്കുന്നതിന്, വഞ്ചനയ്ക്ക്, അല്ലെങ്കിൽ സ്ഥിരീകരിച്ച പരാതികൾ ലഭിക്കുന്നതിന് അക്കൗണ്ടുകൾ സസ്പെൻഡ് ചെയ്യാനോ സ്ഥിരമായി തടയാനോ സ്മാർട്ട് വർക്കേഴ്സിന് അവകാശമുണ്ട്.',
  '10. Governing Law': '10. ഭരണ നിയമം',
  'These Terms are governed by Indian law. Disputes shall be resolved in courts in Kerala, India.':
    'ഈ നിബന്ധനകൾ ഇന്ത്യൻ നിയമത്തിന് വിധേയമാണ്. തർക്കങ്ങൾ കേരളത്തിലെ കോടതികളിൽ പരിഹരിക്കും.',
};

// ── Status keys used to translate the status badge text ──────────────────────
const STATUS_ML = {
  pending:  'കാത്തിരിക്കുന്നു',
  approved: 'അംഗീകരിച്ചു',
  rejected: 'നിരസിച്ചു',
  blocked:  'തടഞ്ഞു',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wp_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Default: respect system preference
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const [lang, setLang] = useState(() => localStorage.getItem('wp_lang') || 'en');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    // Update the browser meta theme-color so address bar matches.
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = isDark ? '#0a0a0a' : '#ffffff';
    localStorage.setItem('wp_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem('wp_lang', lang);
  }, [lang]);

  const t = (key) => (lang === 'ml' ? ML[key] : null) ?? key;
  const tStatus = (status) => (lang === 'ml' ? STATUS_ML[status] : null) ?? (status?.toUpperCase() ?? '');

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, lang, setLang, t, tStatus }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
