export type Language = 'en' | 'ml';

export interface Translations {
  // Navigation
  nav_home: string;
  nav_book_workers: string;
  nav_workers: string;
  nav_about: string;
  nav_contact: string;
  nav_join: string;
  nav_phone: string;

  // Language modal
  lang_modal_title: string;
  lang_modal_subtitle: string;
  lang_choose_en: string;
  lang_choose_en_sub: string;
  lang_choose_ml: string;
  lang_choose_ml_sub: string;
  lang_switch: string;

  // Hero
  hero_badge: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_title_line3: string;
  hero_desc: string;
  hero_btn: string;
  hero_perks: string;
  hero_stat1_num: string;
  hero_stat1_label: string;
  hero_stat2_num: string;
  hero_stat2_label: string;
  hero_stat3_num: string;
  hero_stat3_label: string;
  hero_floating_title: string;
  hero_floating_subtitle: string;
  hero_floating_desc: string;

  // Value Props
  value_verified_title: string;
  value_verified_desc: string;
  value_wage_title: string;
  value_wage_desc: string;
  value_speed_title: string;
  value_speed_desc: string;
  value_support_title: string;
  value_support_desc: string;

  // Worker Selection & Categories
  categories_title: string;
  categories_subtitle: string;
  cat_general_labour: string;
  cat_general_labour_desc: string;
  cat_concrete_finisher: string;
  cat_concrete_finisher_desc: string;
  cat_bricklayer: string;
  cat_bricklayer_desc: string;
  cat_stone_setter: string;
  cat_stone_setter_desc: string;
  cat_tiler: string;
  cat_tiler_desc: string;
  cat_painter: string;
  cat_painter_desc: string;

  role_labourers: string;
  role_head_masons: string;
  role_helpers: string;
  role_carpenters: string;
  role_benders: string;
  role_shift_info: string;
  per_day: string;
  booking_fee: string;
  free_badge: string;
  book_now: string;
  view_workers: string;

  // Date selection
  date_step_title: string;
  date_step_subtitle: string;
  date_advance_notice: string;
  selected_dates: string;
  days_selected: string;
  no_dates_selected: string;
  clear_dates: string;

  // Worker team selection
  select_workers_title: string;
  select_workers_subtitle: string;
  workers_selected_count: string;
  daily_total: string;
  next_enter_details: string;
  back_btn: string;

  // Booking Form
  booking_details_title: string;
  booking_details_subtitle: string;
  client_name_label: string;
  client_name_placeholder: string;
  phone_label: string;
  phone_placeholder: string;
  site_address_label: string;
  site_address_placeholder: string;
  district_label: string;
  district_select_placeholder: string;
  work_desc_label: string;
  work_desc_placeholder: string;
  booking_summary_title: string;
  summary_dates: string;
  summary_crew: string;
  summary_daily_wage: string;
  summary_total_estimate: string;
  whatsapp_submit_btn: string;
  whatsapp_notice: string;

  // Success Modal
  success_title: string;
  success_subtitle: string;
  success_ref_id: string;
  success_whatsapp_note: string;
  success_close_btn: string;

  // Join / About / Contact Modals
  join_modal_title: string;
  join_modal_desc: string;
  about_modal_title: string;
  about_modal_desc: string;
  contact_modal_title: string;
  contact_modal_phone: string;
  contact_modal_hours: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    nav_home: 'Home',
    nav_book_workers: 'Book Workers',
    nav_workers: 'Workers',
    nav_about: 'About Us',
    nav_contact: 'Contact',
    nav_join: 'Join',
    nav_phone: '+91 62384 76615',

    lang_modal_title: 'Choose Your Language',
    lang_modal_subtitle: 'Select your preferred language / ഭാഷ തിരഞ്ഞെടുക്കുക',
    lang_choose_en: 'English',
    lang_choose_en_sub: 'Default for booking & customer support',
    lang_choose_ml: 'മലയാളം (Malayalam)',
    lang_choose_ml_sub: 'കേരളത്തിലെ നിർമ്മാണ തൊഴിലാളികളെ ബുക്ക് ചെയ്യാൻ',
    lang_switch: 'Language',

    hero_badge: 'Direct Verified Labour Allocation Across South India',
    hero_title_line1: 'Skilled Workers.',
    hero_title_line2: 'When You Need',
    hero_title_line3: 'Them.',
    hero_desc: 'Hyraku connects you with skilled and verified workers, making worker discovery, availability, booking and coordination faster and more organized.',
    hero_btn: 'Book Workers',
    hero_perks: 'Zero broker markups • Daily wage transparency • Immediate site dispatch',
    hero_stat1_num: '1,400+',
    hero_stat1_label: 'Vetted Craftsmen',
    hero_stat2_num: '98.4%',
    hero_stat2_label: 'Punctual Arrival',
    hero_stat3_num: '6 Trades',
    hero_stat3_label: 'Masons to Labour',
    hero_floating_title: 'Hyraku Field Crew',
    hero_floating_subtitle: 'On-Site Dispatch',
    hero_floating_desc: 'Equipped with uniforms & safety gear, verified daily skills, ready for deployment.',

    value_verified_title: 'Skill Verified',
    value_verified_desc: 'Every mason and helper undergoes strict trade screening and background verification.',
    value_wage_title: 'Transparent Daily Wage',
    value_wage_desc: 'Government and trade wage transparency. Zero hidden charges or broker commissions.',
    value_speed_title: 'Fast & Easy Booking',
    value_speed_desc: 'Select your dates and crew size in 60 seconds with automated instant dispatch.',
    value_support_title: 'Reliable Field Support',
    value_support_desc: 'Dedicated on-site support and replacement guarantee across all Kerala projects.',

    categories_title: 'Types of Workers Available',
    categories_subtitle: 'Choose verified specialists for residential, commercial, or renovation sites',
    cat_general_labour: 'General Construction Labour',
    cat_general_labour_desc: 'Manual site support, material handling, loading/unloading, debris clearance, and earth excavation assistance.',
    cat_concrete_finisher: 'Concrete Finisher / Cement Setter',
    cat_concrete_finisher_desc: 'Screeding, surface leveling, foundation pouring, shuttering vibration, and durable smooth cement finishes.',
    cat_bricklayer: 'Wall Bricklayer & AAC Block Mason',
    cat_bricklayer_desc: 'Precision red brick, fly ash block, AAC block bonding, mortar mixing, plumb line alignment, and lintels.',
    cat_stone_setter: 'Stone Breaker / Stone Setter',
    cat_stone_setter_desc: 'Natural granite, laterite stone masonry, dressed stone claddings, retaining wall craftsmanship, and dry stone setting.',
    cat_tiler: 'Tiles, Marble & Granite Setter',
    cat_tiler_desc: 'Vitrified, ceramic, marble, and mosaic floor and wall laying with laser leveling, spacer precision, and epoxy grouting.',
    cat_painter: 'Wall Painter & Waterproofing Expert',
    cat_painter_desc: 'Interior/exterior putty, primer, emulsion coats, weather-proofing texture coats, and waterproofing chemical treatment.',

    role_labourers: 'Labourers',
    role_head_masons: 'Head Masons',
    role_helpers: 'Helpers',
    role_carpenters: 'Shuttering Carpenters',
    role_benders: 'Bar Benders',
    role_shift_info: 'Direct site dispatch • 8 hours shift',
    per_day: '/day',
    booking_fee: 'Booking Fee',
    free_badge: 'FREE',
    book_now: 'Book Now',
    view_workers: 'Select Crew',

    date_step_title: 'Select Work Dates',
    date_step_subtitle: 'Pick the specific days you need workers on-site (up to 4 months in advance)',
    date_advance_notice: '4 Months Advance Booking Available',
    selected_dates: 'Selected Dates',
    days_selected: 'Days Selected',
    no_dates_selected: 'No dates selected yet. Click any day on the calendar below.',
    clear_dates: 'Clear Dates',

    select_workers_title: 'Select Number of Workers',
    select_workers_subtitle: 'Use the + and - buttons to specify exact crew requirements',
    workers_selected_count: 'Workers Selected',
    daily_total: 'Estimated Daily Cost',
    next_enter_details: 'Next: Request Work Dates & Details',
    back_btn: 'Back',

    booking_details_title: 'Request for Booking',
    booking_details_subtitle: 'Select work dates and send your request to WhatsApp. Hyraku will check availability and send you a confirmation message.',
    client_name_label: 'Your Full Name',
    client_name_placeholder: 'e.g. Anand Kumar',
    phone_label: 'Phone / WhatsApp Number',
    phone_placeholder: '10-digit mobile number',
    site_address_label: 'Site Address & Landmark',
    site_address_placeholder: 'e.g. Near Metro Station, MG Road, Kochi',
    district_label: 'Kerala District',
    district_select_placeholder: 'Select District',
    work_desc_label: 'Work Description / Site Notes',
    work_desc_placeholder: 'Briefly describe the work (e.g., 2nd floor concrete slab pouring, boundary wall masonry)',
    booking_summary_title: 'Booking Request Summary',
    summary_dates: 'Requested Work Dates',
    summary_crew: 'Requested Crew',
    summary_daily_wage: 'Daily Wage Total',
    summary_total_estimate: 'Estimated Total Wages',
    whatsapp_submit_btn: 'Send Booking Request via WhatsApp',
    whatsapp_notice: 'Tapping this sends your request to Hyraku WhatsApp (+91 62384 76615). Note: Booking is NOT instantly confirmed. Hyraku will check worker availability and send an official confirmation message to you on WhatsApp.',

    success_title: 'Booking Request Sent to Hyraku!',
    success_subtitle: 'Availability check in progress. Your booking is NOT confirmed yet.',
    success_ref_id: 'Booking Request ID',
    success_whatsapp_note: 'The Hyraku team is now checking worker availability for your requested date(s). Official confirmation will be delivered to your WhatsApp shortly.',
    success_close_btn: 'Done & Return to Home',

    join_modal_title: 'Join Hyraku as a Worker',
    join_modal_desc: 'Are you a skilled mason, helper, carpenter, or painter? Join Kerala\'s largest direct construction workforce platform with guaranteed prompt daily wages.',
    about_modal_title: 'About Hyraku Services',
    about_modal_desc: 'Hyraku is South India\'s leading direct labour allocation network. We eliminate middlemen commissions, ensuring contractors get reliable craftsmen and workers receive fair, transparent wages.',
    contact_modal_title: 'Hyraku Help & Dispatch',
    contact_modal_phone: 'Direct Helpline: +91 62384 76615',
    contact_modal_hours: 'Monday to Sunday: 6:00 AM - 9:00 PM',
  },

  ml: {
    nav_home: 'ഹോം',
    nav_book_workers: 'തൊഴിലാളികളെ ബുക്ക് ചെയ്യുക',
    nav_workers: 'തൊഴിലാളികൾ',
    nav_about: 'ഞങ്ങളെക്കുറിച്ച്',
    nav_contact: 'ബന്ധപ്പെടുക',
    nav_join: 'ജോയിൻ ചെയ്യുക',
    nav_phone: '+91 62384 76615',

    lang_modal_title: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    lang_modal_subtitle: 'തുടരുന്നതിനായി നിങ്ങളുടെ സൗകര്യപ്രദമായ ഭാഷ തിരഞ്ഞെടുക്കുക / Select your language',
    lang_choose_en: 'English (ഇംഗ്ലീഷ്)',
    lang_choose_en_sub: 'Default for booking & customer support',
    lang_choose_ml: 'മലയാളം (Malayalam)',
    lang_choose_ml_sub: 'കേരളത്തിലെ നിർമ്മാണ തൊഴിലാളികളെ എളുപ്പത്തിൽ ബുക്ക് ചെയ്യാൻ',
    lang_switch: 'ഭാഷ',

    hero_badge: 'ദക്ഷിണേന്ത്യയിലുടനീളം നേരിട്ട് സ്ഥിരീകരിച്ച തൊഴിൽ വിതരണം',
    hero_title_line1: 'വിദഗ്ദ്ധ തൊഴിലാളികൾ.',
    hero_title_line2: 'നിങ്ങൾക്ക് ആവശ്യമുള്ളപ്പോൾ',
    hero_title_line3: 'ലഭ്യമാണ്.',
    hero_desc: 'ഹൈറാകു നിങ്ങളെ വിദഗ്ദ്ധരും അംഗീകൃതരുമായ തൊഴിലാളികളുമായി നേരിട്ട് ബന്ധിപ്പിക്കുന്നു, തൊഴിലാളികളെ കണ്ടെത്തലും ദിവസക്കൂലി ബുക്കിംഗും കൂടുതൽ വേഗത്തിലും സുതാര്യവുമാക്കുന്നു.',
    hero_btn: 'തൊഴിലാളികളെ ബുക്ക് ചെയ്യുക',
    hero_perks: 'ബ്രോക്കർ കമ്മീഷൻ ഇല്ല • ദിവസക്കൂലി സുതാര്യത • ഉടനടി സൈറ്റ് ഡിസ്പാച്ച്',
    hero_stat1_num: '1,400+',
    hero_stat1_label: 'പരിശീലനം സിദ്ധിച്ചവർ',
    hero_stat2_num: '98.4%',
    hero_stat2_label: 'കൃത്യസമയത്തുള്ള വരവ്',
    hero_stat3_num: '6 പ്രവൃത്തികൾ',
    hero_stat3_label: 'മേസ്തിരി മുതൽ ലേബർ വരെ',
    hero_floating_title: 'ഹൈറാകു ഫീൽഡ് ടീം',
    hero_floating_subtitle: 'നേരിട്ടുള്ള സൈറ്റ് ഡിസ്പാച്ച്',
    hero_floating_desc: 'യൂണിഫോമും സുരക്ഷാ ഉപകരണങ്ങളുമുള്ള അംഗീകൃത തൊഴിലാളികൾ ഉടനടി ലഭ്യമാണ്.',

    value_verified_title: 'പരിശോധിച്ച പ്രാവീണ്യം',
    value_verified_desc: 'ഓരോ മേസ്തിരിയെയും സഹായിയെയും നേരിട്ട് പരിശോധിച്ച് പ്രവൃത്തി പരിചയം ഉറപ്പുവരുത്തുന്നു.',
    value_wage_title: 'സുതാര്യമായ ദിവസക്കൂലി',
    value_wage_desc: 'സർക്കാർ മാനദണ്ഡപ്രകാരമുള്ള ന്യായമായ കൂലി. യാതൊരുവിധ മറഞ്ഞിരിക്കുന്ന ചാർജുകളോ ഇടനിലക്കാരുടെ കമ്മീഷനോ ഇല്ല.',
    value_speed_title: 'വേഗത്തിലുള്ള ബുക്കിംഗ്',
    value_speed_desc: 'നിങ്ങൾക്ക് ആവശ്യമുള്ള തീയതികളും തൊഴിലാളികളുടെ എണ്ണവും 60 സെക്കൻഡിൽ തിരഞ്ഞെടുത്തു ബുക്ക് ചെയ്യാം.',
    value_support_title: 'വിശ്വസനീയമായ പിന്തുണ',
    value_support_desc: 'സൈറ്റിൽ ഏതെങ്കിലും അടിയന്തര ആവശ്യമുണ്ടെങ്കിൽ റീപ്ലേസ്മെന്റ് ഗ്യാരണ്ടിയും സഹായവും.',

    categories_title: 'ലഭ്യമായ തൊഴിലാളി വിഭാഗങ്ങൾ',
    categories_subtitle: 'നിങ്ങളുടെ നിർമ്മാണ സൈറ്റിന് ആവശ്യമായ വിദഗ്ദ്ധരെ തിരഞ്ഞെടുക്കുക',
    cat_general_labour: 'സാധാരണ നിർമ്മാണ തൊഴിലാളികൾ (ലേബർ)',
    cat_general_labour_desc: 'മെറ്റീരിയൽ ഹാൻഡ്‌ലിംഗ്, സാധനങ്ങൾ കയറ്റൽ/ഇറക്കൽ, മണ്ണ് മാറ്റൽ, നിർമ്മാണ സൈറ്റ് ക്ലീനിംഗ് എന്നിവയ്ക്കുള്ള സഹായികൾ.',
    cat_concrete_finisher: 'കോൺക്രീറ്റ് ഫിനിഷർ / സിമന്റ് സെറ്റർ',
    cat_concrete_finisher_desc: 'ഫൗണ്ടേഷൻ, കോൺക്രീറ്റ് വാർക്കൽ, സർഫേസ് ലെവലിംഗ്, വൈബ്രേഷൻ, മനോഹരമായ സിമന്റ് ഫിനിഷിംഗ് എന്നിവ.',
    cat_bricklayer: 'കട്ടകെട്ട് മേസ്തിരി & ബ്ലോക്ക് വർക്കർ',
    cat_bricklayer_desc: 'ചെങ്കല്ല്, വെട്ടുകല്ല്, സിമന്റ് ഇഷ്ടിക, എ.എ.സി ബ്ലോക്ക് കെട്ടൽ, പ്ലംബ് ലൈൻ കൃത്യത, മോർട്ടാർ മിക്സിംഗ്.',
    cat_stone_setter: 'സ്റ്റോൺ ബ്രേക്കർ / സ്റ്റോൺ സെറ്റർ',
    cat_stone_setter_desc: 'ഗ്രാനൈറ്റ്, കരിങ്കല്ല് തറകെട്ട്, സംരക്ഷണ ഭിത്തികൾ (റീറ്റൈനിംഗ് വാൾ), പ്രകൃതിദത്ത കല്ല് പാകൽ.',
    cat_tiler: 'ടൈൽസ്, മാർബിൾ & ഗ്രാനൈറ്റ് പണിക്കാർ',
    cat_tiler_desc: 'വിട്രിഫൈഡ്, സിറാമിക്, മാർബിൾ, ഗ്രാനൈറ്റ് ഫ്ലോറിംഗ്, ലേസർ ലെവലിംഗ്, സ്പേസർ ഫിക്സിംഗ്, എപ്പോക്സി ഗ്രൗട്ടിംഗ്.',
    cat_painter: 'പെയിന്റിംഗ് & വാട്ടർപ്രൂഫിംഗ് വിദഗ്ദ്ധർ',
    cat_painter_desc: 'ഇന്റീരിയർ/എക്സ്റ്റീരിയർ പുട്ടി, പ്രൈമർ, ഇമൽഷൻ പെയിന്റ്, ടെക്സ്ചർ, വാട്ടർപ്രൂഫിംഗ് ട്രീറ്റ്മെന്റ്.',

    role_labourers: 'തൊഴിലാളികൾ (ലേബറേഴ്സ്)',
    role_head_masons: 'മേസ്തിരിമാർ (ഹെഡ് മേസൺസ്)',
    role_helpers: 'സഹായികൾ (ഹെൽപ്പർമാർ)',
    role_carpenters: 'ഷട്ടറിംഗ് ആശാരിമാർ',
    role_benders: 'കമ്പിപ്പണിക്കാർ (ബാർ ബെൻഡർ)',
    role_shift_info: 'നേരിട്ട് സൈറ്റ് ഡിസ്പാച്ച് • 8 മണിക്കൂർ ഷിഫ്റ്റ്',
    per_day: '/ദിവസം',
    booking_fee: 'ബുക്കിംഗ് ഫീസ്',
    free_badge: 'സൗജന്യം',
    book_now: 'ഇപ്പോൾ ബുക്ക് ചെയ്യുക',
    view_workers: 'തൊഴിലാളികളെ തിരഞ്ഞെടുക്കുക',

    date_step_title: 'തീയതികൾ തിരഞ്ഞെടുക്കുക',
    date_step_subtitle: 'ജോലി ആവശ്യമുള്ള ദിവസങ്ങൾ ക്ലിക്ക് ചെയ്യുക (അടുത്ത 4 മാസം വരെ മുൻകൂട്ടി ബുക്ക് ചെയ്യാം)',
    date_advance_notice: '4 മാസം മുൻകൂട്ടിയുള്ള ബുക്കിംഗ് ലഭ്യമാണ്',
    selected_dates: 'തിരഞ്ഞെടുത്ത തീയതികൾ',
    days_selected: 'ദിവസങ്ങൾ തിരഞ്ഞെടുത്തു',
    no_dates_selected: 'തീയതികൾ തിരഞ്ഞെടുത്തിട്ടില്ല. താഴെയുള്ള കലണ്ടറിൽ നിന്നും ആവശ്യമുള്ള തീയതികൾ ക്ലിക്ക് ചെയ്യുക.',
    clear_dates: 'തീയതികൾ മാറ്റുക',

    select_workers_title: 'തൊഴിലാളികളുടെ എണ്ണം തിരഞ്ഞെടുക്കുക',
    select_workers_subtitle: '+, - ബട്ടണുകൾ ഉപയോഗിച്ച് ഓരോ വിഭാഗത്തിലും ആവശ്യമായ തൊഴിലാളികളുടെ എണ്ണം നൽകുക',
    workers_selected_count: 'തിരഞ്ഞെടുത്ത തൊഴിലാളികൾ',
    daily_total: 'പ്രതീക്ഷിക്കുന്ന ദിവസേന ചിലവ്',
    next_enter_details: 'മുമ്പോട്ട്: തീയതിയും വിവരങ്ങളും നൽകുക',
    back_btn: 'തിരികെ',

    booking_details_title: 'ബുക്കിംഗ് അഭ്യർത്ഥന നൽകുക',
    booking_details_subtitle: 'ജോലി തീയതികൾ തിരഞ്ഞെടുത്ത് അഭ്യർത്ഥന അയക്കുക. ഹൈറാകു ലഭ്യത പരിശോധിച്ച് WhatsApp വഴി സ്ഥിരീകരണ സന്ദേശം അയക്കും.',
    client_name_label: 'നിങ്ങളുടെ പേര്',
    client_name_placeholder: 'ഉദാ: ആനന്ദ് കുമാർ',
    phone_label: 'ഫോൺ / വാട്സ്ആപ്പ് നമ്പർ',
    phone_placeholder: '10 അക്ക മൊബൈൽ നമ്പർ',
    site_address_label: 'സൈറ്റ് വിലാസം & ലാൻഡ്മാർക്ക്',
    site_address_placeholder: 'ഉദാ: മെട്രോ സ്റ്റേഷന് സമീപം, എം.ജി റോഡ്, എറണാകുളം',
    district_label: 'കേരളത്തിലെ ജില്ല',
    district_select_placeholder: 'ജില്ല തിരഞ്ഞെടുക്കുക',
    work_desc_label: 'ജോലിയുടെ വിവരണം',
    work_desc_placeholder: 'ജോലിയുടെ വിവരങ്ങൾ ചുരുക്കത്തിൽ വ്യക്തമാക്കുക (ഉദാ: വാർക്ക പണി, മതിൽ കെട്ട്)',
    booking_summary_title: 'ബുക്കിംഗ് അഭ്യർത്ഥന സംഗ്രഹം',
    summary_dates: 'ആവശ്യപ്പെട്ട തീയതികൾ',
    summary_crew: 'ആവശ്യമായ തൊഴിലാളികൾ',
    summary_daily_wage: 'ആകെ ദിവസക്കൂലി',
    summary_total_estimate: 'പ്രതീക്ഷിക്കുന്ന ആകെ കൂലി',
    whatsapp_submit_btn: 'WhatsApp വഴി ബുക്കിംഗ് അഭ്യർത്ഥന അയക്കുക',
    whatsapp_notice: 'ഇത് ഹൈറാകു WhatsApp-ലേക്ക് (+91 62384 76615) ബുക്കിംഗ് അഭ്യർത്ഥനയായി അയക്കും. ശ്രദ്ധിക്കുക: ബുക്കിംഗ് ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല. ഹൈറാകു ലഭ്യത പരിശോധിച്ച് WhatsApp-ൽ സ്ഥിരീകരണ സന്ദേശം അയക്കുമ്പോൾ മാത്രമേ ബുക്കിംഗ് ഉറപ്പാകൂ.',

    success_title: 'ബുക്കിംഗ് അഭ്യർത്ഥന ഹൈറാകുവിന് അയച്ചു!',
    success_subtitle: 'ലഭ്യത പരിശോധന പുരോഗമിക്കുന്നു. ബുക്കിംഗ് ഇതുവരെ സ്ഥിരീകരിച്ചിട്ടില്ല.',
    success_ref_id: 'അഭ്യർത്ഥന റഫറൻസ് ഐഡി',
    success_whatsapp_note: 'നിങ്ങൾ ആവശ്യപ്പെട്ട തീയതികളിൽ തൊഴിലാളികളുടെ ലഭ്യത ഹൈറാകു സംഘം പരിശോധിച്ച ശേഷം WhatsApp വഴി ഔദ്യോഗിക സ്ഥിരീകരണ സന്ദേശം അയക്കുന്നതാണ്.',
    success_close_btn: 'ശരി, ഹോം പേജിലേക്ക് മടങ്ങുക',

    join_modal_title: 'തൊഴിലാളിയായി ഹൈറാകുവിൽ ചേരുക',
    join_modal_desc: 'നിങ്ങൾ പരിചയസമ്പന്നനായ മേസ്തിരിയോ, സഹായിയോ, പെയിന്ററോ ആണോ? കേരളത്തിലെ ഏറ്റവും വലിയ തൊഴിലാളി പ്ലാറ്റ്ഫോമിൽ അംഗമാകൂ. സ്ഥിരമായ ജോലിയും ഉറപ്പായ ദിവസക്കൂലിയും നേടൂ.',
    about_modal_title: 'ഹൈറാകു സർവീസസ് കുറിച്ച്',
    about_modal_desc: 'നിർമ്മാണ മേഖലയിലെ ഇടനിലക്കാരെ ഒഴിവാക്കി, കരാറുകാർക്കും വീട്ടുടമകൾക്കും കൃത്യമായ തൊഴിലാളികളെ ലഭ്യമാക്കുന്ന ആധുനിക പ്ലാറ്റ്ഫോമാണ് ഹൈറാകു.',
    contact_modal_title: 'ഹൈറാകു ഹെൽപ്പ് & സപ്പോർട്ട്',
    contact_modal_phone: 'നേരിട്ടുള്ള ഫോൺ നമ്പർ: +91 62384 76615',
    contact_modal_hours: 'തിങ്കൾ മുതൽ ഞായർ വരെ: രാവിലെ 6:00 മുതൽ രാത്രി 9:00 വരെ',
  },
};
