/**
 * Industry-based smart defaults for QuickStart Wizard
 * Pre-populates content based on selected industry
 */


/**
 * Industry to template mapping with default layouts
 */
export const INDUSTRY_TEMPLATES = {
  restaurant: { 
    template: 'restaurant', 
    layout: 'casual',
    category: 'Food & Dining'
  },
  salon: { 
    template: 'salon', 
    layout: 'modern-studio',
    category: 'Beauty & Wellness'
  },
  fitness: { 
    template: 'gym', 
    layout: 'crossfit',
    category: 'Fitness & Health'
  },
  gym: {
    template: 'gym',
    layout: 'crossfit',
    category: 'Fitness & Health'
  },
  consultant: { 
    template: 'consultant', 
    layout: 'strategic',
    category: 'Professional Services'
  },
  freelancer: { 
    template: 'freelancer', 
    layout: 'creative',
    category: 'Professional Services'
  },
  cleaning: { 
    template: 'cleaning', 
    layout: 'residential',
    category: 'Home Services'
  },
  electrician: { 
    template: 'electrician', 
    layout: 'commercial',
    category: 'Home Services'
  },
  plumbing: { 
    template: 'plumbing', 
    layout: 'residential',
    category: 'Home Services'
  },
  'auto-repair': { 
    template: 'auto-repair', 
    layout: 'full-service',
    category: 'Automotive'
  },
  'pet-care': { 
    template: 'pet-care', 
    layout: 'grooming',
    category: 'Pet Services'
  },
  'tech-repair': { 
    template: 'tech-repair', 
    layout: 'phone-repair',
    category: 'Technology'
  },
  'product-showcase': { 
    template: 'product-showcase', 
    layout: 'ecommerce',
    category: 'Retail'
  },
  'tow-truck': {
    template: 'tow-truck',
    layout: 'full-service',
    category: 'Transportation'
  },
  'product-ordering': {
    template: 'product-ordering',
    layout: 'ecommerce',
    category: 'Retail'
  }
};

/**
 * Hero title/subtitle templates with placeholders
 */
export const HERO_TEMPLATES = {
  restaurant: {
    title: 'Welcome to [Business Name]',
    subtitle: 'Delicious food, memorable moments. Experience the finest dining in town.'
  },
  salon: {
    title: 'Look & Feel Your Best',
    subtitle: 'Professional beauty services tailored to you. Book your appointment today.'
  },
  fitness: {
    title: 'Transform Your Body & Mind',
    subtitle: 'Join our fitness community and achieve your goals with expert trainers.'
  },
  gym: {
    title: 'Transform Your Body & Mind',
    subtitle: 'Join our fitness community and achieve your goals with expert trainers.'
  },
  consultant: {
    title: 'Strategic Solutions for Your Business',
    subtitle: 'Expert consulting services to help your business grow and succeed.'
  },
  freelancer: {
    title: 'Creative Solutions, Delivered',
    subtitle: 'Professional services tailored to your unique needs and vision.'
  },
  cleaning: {
    title: 'Spotless Results, Every Time',
    subtitle: 'Professional cleaning services for your home or business.'
  },
  electrician: {
    title: 'Expert Electrical Services',
    subtitle: 'Licensed professionals ready to handle all your electrical needs.'
  },
  plumbing: {
    title: 'Reliable Plumbing Solutions',
    subtitle: 'Fast, professional plumbing services when you need them most.'
  },
  'auto-repair': {
    title: 'Expert Auto Repair & Service',
    subtitle: 'Quality automotive services to keep your vehicle running smoothly.'
  },
  'pet-care': {
    title: 'Caring for Your Furry Friends',
    subtitle: 'Professional pet care services with love and expertise.'
  },
  'tech-repair': {
    title: 'Fast Tech Repair Services',
    subtitle: 'Expert repair for phones, computers, and all your tech devices.'
  },
  'product-showcase': {
    title: 'Discover Our Products',
    subtitle: 'Quality products delivered right to your door.'
  },
  'tow-truck': {
    title: '24/7 Towing & Roadside Assistance',
    subtitle: 'Fast, reliable help when you need it most.'
  },
  'product-ordering': {
    title: 'Quality Products, Easy Ordering',
    subtitle: 'Browse the catalog and order for pickup or delivery.'
  }
};

/**
 * Default services per industry (2-3 services)
 */
export const DEFAULT_SERVICES = {
  restaurant: [
    { name: 'Dine-In', description: 'Fresh dishes made to order', price: '' },
    { name: 'Takeout', description: 'Your favorites, ready to go', price: '' },
    { name: 'Catering', description: 'Events and large orders', price: '' }
  ],
  salon: [
    { name: 'Haircut & Style', description: 'Professional cut and styling', price: '$45' },
    { name: 'Color Service', description: 'Full color or highlights', price: '$120' },
    { name: 'Manicure & Pedicure', description: 'Complete nail care', price: '$65' }
  ],
  fitness: [
    { name: 'Personal Training', description: 'One-on-one fitness coaching', price: '$75/session' },
    { name: 'Group Classes', description: 'Join our group fitness sessions', price: '$20/class' },
    { name: 'Membership', description: 'Unlimited access to all facilities', price: '$99/month' }
  ],
  gym: [
    { name: 'Personal Training', description: 'One-on-one fitness coaching', price: '$75/session' },
    { name: 'Group Classes', description: 'Join our group fitness sessions', price: '$20/class' },
    { name: 'Membership', description: 'Unlimited access to all facilities', price: '$99/month' }
  ],
  consultant: [
    { name: 'Strategy Consulting', description: 'Business strategy and planning', price: '$150/hour' },
    { name: 'Project Management', description: 'End-to-end project oversight', price: '$200/hour' }
  ],
  freelancer: [
    { name: 'Web Design', description: 'Custom website design and development', price: '$2,500' },
    { name: 'Brand Identity', description: 'Logo and brand design package', price: '$1,200' }
  ],
  cleaning: [
    { name: 'Residential Cleaning', description: 'Regular home cleaning service', price: '$120/visit' },
    { name: 'Commercial Cleaning', description: 'Office and commercial spaces', price: 'Custom quote' }
  ],
  electrician: [
    { name: 'Electrical Repair', description: 'Fast, reliable electrical repairs', price: '$125/hour' },
    { name: 'Installation', description: 'New electrical installations', price: 'Free estimate' }
  ],
  plumbing: [
    { name: 'Emergency Repair', description: '24/7 emergency plumbing service', price: '$150/hour' },
    { name: 'Installation', description: 'New plumbing installations', price: 'Free estimate' }
  ],
  'auto-repair': [
    { name: 'Oil Change', description: 'Regular maintenance service', price: '$45' },
    { name: 'Brake Service', description: 'Complete brake inspection and repair', price: '$250' }
  ],
  'pet-care': [
    { name: 'Grooming', description: 'Full-service pet grooming', price: '$60' },
    { name: 'Boarding', description: 'Safe and comfortable pet boarding', price: '$35/night' }
  ],
  'tech-repair': [
    { name: 'Phone Repair', description: 'Screen, battery, and component repair', price: 'Starting at $79' },
    { name: 'Computer Repair', description: 'Hardware and software solutions', price: '$99/hour' }
  ],
  'product-showcase': [
    { name: 'Product Consultation', description: 'Expert advice on our products', price: 'Free' }
  ],
  'tow-truck': [
    { name: 'Local Tow', description: 'Up to 10 miles', price: 'from $75' },
    { name: 'Roadside Assistance', description: 'Jump-start, lockout, tire', price: 'from $49' }
  ],
  'product-ordering': [
    { name: 'Bestseller Item', description: 'Our most popular product', price: '$29' },
    { name: 'Gift Set', description: 'A curated bundle', price: '$49' }
  ]
};

/**
 * Color theme presets (3 per industry)
 */
export const COLOR_THEMES = {
  restaurant: [
    { name: 'Modern', primary: '#ef4444', accent: '#dc2626', description: 'Bold reds for energy' },
    { name: 'Classic', primary: '#92400e', accent: '#78350f', description: 'Warm browns for elegance' },
    { name: 'Fresh', primary: '#059669', accent: '#047857', description: 'Green tones for freshness' }
  ],
  salon: [
    { name: 'Luxury', primary: '#a855f7', accent: '#9333ea', description: 'Rich purples for luxury' },
    { name: 'Modern', primary: '#ec4899', accent: '#db2777', description: 'Pink tones for modern style' },
    { name: 'Elegant', primary: '#6366f1', accent: '#4f46e5', description: 'Sophisticated indigo' }
  ],
  fitness: [
    { name: 'Bold', primary: '#dc2626', accent: '#b91c1c', description: 'Energetic reds' },
    { name: 'Strong', primary: '#1e40af', accent: '#1e3a8a', description: 'Powerful blues' },
    { name: 'Dynamic', primary: '#ea580c', accent: '#c2410c', description: 'Vibrant oranges' }
  ],
  gym: [
    { name: 'Bold', primary: '#dc2626', accent: '#b91c1c', description: 'Energetic reds' },
    { name: 'Strong', primary: '#1e40af', accent: '#1e3a8a', description: 'Powerful blues' },
    { name: 'Dynamic', primary: '#ea580c', accent: '#c2410c', description: 'Vibrant oranges' }
  ],
  consultant: [
    { name: 'Professional', primary: '#1e40af', accent: '#1e3a8a', description: 'Trustworthy blues' },
    { name: 'Modern', primary: '#6366f1', accent: '#4f46e5', description: 'Contemporary indigo' },
    { name: 'Classic', primary: '#374151', accent: '#1f2937', description: 'Timeless grays' }
  ],
  freelancer: [
    { name: 'Creative', primary: '#8b5cf6', accent: '#7c3aed', description: 'Creative purples' },
    { name: 'Bold', primary: '#06b6d4', accent: '#0891b2', description: 'Vibrant cyans' },
    { name: 'Professional', primary: '#0ea5e9', accent: '#0284c7', description: 'Professional blues' }
  ],
  cleaning: [
    { name: 'Fresh', primary: '#10b981', accent: '#059669', description: 'Clean greens' },
    { name: 'Bright', primary: '#06b6d4', accent: '#0891b2', description: 'Bright cyans' },
    { name: 'Clean', primary: '#3b82f6', accent: '#2563eb', description: 'Clean blues' }
  ],
  electrician: [
    { name: 'Electric', primary: '#fbbf24', accent: '#f59e0b', description: 'Electric yellows' },
    { name: 'Bright', primary: '#06b6d4', accent: '#0891b2', description: 'Bright cyans' },
    { name: 'Professional', primary: '#3b82f6', accent: '#2563eb', description: 'Professional blues' }
  ],
  plumbing: [
    { name: 'Water', primary: '#06b6d4', accent: '#0891b2', description: 'Water blues' },
    { name: 'Trust', primary: '#3b82f6', accent: '#2563eb', description: 'Trustworthy blues' },
    { name: 'Reliable', primary: '#0ea5e9', accent: '#0284c7', description: 'Reliable blues' }
  ],
  'auto-repair': [
    { name: 'Mechanic', primary: '#dc2626', accent: '#b91c1c', description: 'Bold reds' },
    { name: 'Strong', primary: '#1e40af', accent: '#1e3a8a', description: 'Strong blues' },
    { name: 'Classic', primary: '#374151', accent: '#1f2937', description: 'Classic grays' }
  ],
  'pet-care': [
    { name: 'Friendly', primary: '#f59e0b', accent: '#d97706', description: 'Warm oranges' },
    { name: 'Playful', primary: '#10b981', accent: '#059669', description: 'Playful greens' },
    { name: 'Caring', primary: '#ec4899', accent: '#db2777', description: 'Caring pinks' }
  ],
  'tech-repair': [
    { name: 'Tech', primary: '#6366f1', accent: '#4f46e5', description: 'Tech indigo' },
    { name: 'Modern', primary: '#06b6d4', accent: '#0891b2', description: 'Modern cyan' },
    { name: 'Professional', primary: '#1e40af', accent: '#1e3a8a', description: 'Professional blue' }
  ],
  'product-showcase': [
    { name: 'Retail', primary: '#ef4444', accent: '#dc2626', description: 'Retail reds' },
    { name: 'Modern', primary: '#8b5cf6', accent: '#7c3aed', description: 'Modern purples' },
    { name: 'Classic', primary: '#374151', accent: '#1f2937', description: 'Classic grays' }
  ],
  'tow-truck': [
    { name: 'Workshop', primary: '#a8763e', accent: '#7c5a32', description: 'Bronze workshop' },
    { name: 'Strong', primary: '#1e40af', accent: '#1e3a8a', description: 'Strong blues' },
    { name: 'Classic', primary: '#374151', accent: '#1f2937', description: 'Classic grays' }
  ],
  'product-ordering': [
    { name: 'Retail', primary: '#3b82f6', accent: '#2563eb', description: 'Order blues' },
    { name: 'Warm', primary: '#c2410c', accent: '#9a3412', description: 'Warm shop' },
    { name: 'Classic', primary: '#374151', accent: '#1f2937', description: 'Classic grays' }
  ]
};

/**
 * Get smart defaults for an industry
 */
export function getIndustryDefaults(industry) {
  const templateConfig = INDUSTRY_TEMPLATES[industry];
  if (!templateConfig) {
    // Fallback to consultant if industry not found
    return getIndustryDefaults('consultant');
  }

  const hero = HERO_TEMPLATES[industry] || HERO_TEMPLATES.consultant;
  const services = DEFAULT_SERVICES[industry] || DEFAULT_SERVICES.consultant;
  const themes = COLOR_THEMES[industry] || COLOR_THEMES.consultant;

  return {
    template: templateConfig.template,
    category: templateConfig.category,
    hero: {
      title: hero.title,
      subtitle: hero.subtitle
    },
    services: services.map(s => ({
      ...s,
      id: Date.now() + Math.random().toString(36).substr(2, 9)
    })),
    themes: themes,
    defaultTheme: themes[0] // First theme is default
  };
}

/**
 * Replace placeholder in text
 */
export function replacePlaceholder(text, businessName) {
  return text.replace(/\[Business Name\]/g, businessName || 'Your Business');
}


