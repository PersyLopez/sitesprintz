// Configuration for template layout variations
// Maps base template IDs to their available layout options

export const TEMPLATE_LAYOUTS = {
  restaurant: {
    base: 'restaurant',
    category: 'Food & Dining',
    color: '#ef4444',
    defaultLayout: 'casual',
    layouts: {
      'fine-dining': {
        name: 'Fine Dining',
        emoji: '🍷',
        description: 'Upscale dining with tasting menus',
        features: ['Tasting menus', 'Wine pairings', 'Chef\'s table', 'Prix-fixe options']
      },
      'casual': {
        name: 'Casual Dining',
        emoji: '🍔',
        description: 'Family-friendly neighborhood restaurant',
        features: ['Full menu', 'Kids menu', 'Daily specials', 'Takeout & delivery']
      },
      'fast-casual': {
        name: 'Fast Casual',
        emoji: '🥗',
        description: 'Modern quick-service concept',
        features: ['Build-your-own', 'Nutrition info', 'Rewards program', 'Quick service']
      }
    }
  },
  
  salon: {
    base: 'salon',
    category: 'Beauty & Wellness',
    color: '#a855f7',
    defaultLayout: 'modern-studio',
    layouts: {
      'luxury-spa': {
        name: 'Luxury Spa',
        emoji: '✨',
        description: 'High-end spa experience',
        features: ['Premium services', 'Spa packages', 'VIP treatments', 'Wellness focus']
      },
      'modern-studio': {
        name: 'Modern Studio',
        emoji: '💅',
        description: 'Trendy contemporary salon',
        features: ['Modern styles', 'Latest trends', 'Social media ready', 'Urban vibe']
      },
      'neighborhood': {
        name: 'Neighborhood Salon',
        emoji: '🏘️',
        description: 'Family-friendly local salon',
        features: ['All ages', 'Classic styles', 'Affordable pricing', 'Community focused']
      }
    }
  },
  
  gym: {
    base: 'gym',
    category: 'Fitness & Health',
    color: '#dc2626',
    defaultLayout: 'boutique',
    layouts: {
      'boutique': {
        name: 'Boutique Fitness',
        emoji: '🧘',
        description: 'Specialized fitness classes',
        features: ['Yoga & Pilates', 'Small classes', 'Personal attention', 'Wellness focused']
      },
      'strength': {
        name: 'Strength Gym',
        emoji: '🏋️',
        description: 'Powerlifting and strength training',
        features: ['Heavy weights', 'Powerlifting', 'Olympic lifting', 'Serious training']
      },
      'family': {
        name: 'Family Fitness',
        emoji: '👨‍👩‍👧',
        description: 'All ages fitness center',
        features: ['Kids programs', 'Family classes', 'Childcare', 'All fitness levels']
      }
    }
  },
  
  consultant: {
    base: 'consultant',
    category: 'Professional Services',
    color: '#1e40af',
    defaultLayout: 'corporate',
    layouts: {
      'corporate': {
        name: 'Corporate Strategy',
        emoji: '🏢',
        description: 'Enterprise consulting',
        features: ['Strategic planning', 'Large organizations', 'C-suite advisory', 'Change management']
      },
      'small-business': {
        name: 'Small Business',
        emoji: '💼',
        description: 'SME focused consulting',
        features: ['Growth strategies', 'Operations', 'Marketing', 'SME expertise']
      },
      'executive-coach': {
        name: 'Executive Coach',
        emoji: '🎯',
        description: 'Leadership development',
        features: ['Leadership coaching', '1-on-1 sessions', 'Career development', 'Personal growth']
      }
    }
  },
  
  freelancer: {
    base: 'freelancer',
    category: 'Professional Services',
    color: '#0ea5e9',
    defaultLayout: 'designer',
    layouts: {
      'designer': {
        name: 'Designer',
        emoji: '🎨',
        description: 'Visual design portfolio',
        features: ['UI/UX design', 'Brand identity', 'Creative work', 'Portfolio showcase']
      },
      'developer': {
        name: 'Developer',
        emoji: '⚡',
        description: 'Code & technical projects',
        features: ['Web development', 'App development', 'Technical expertise', 'Code samples']
      },
      'writer': {
        name: 'Writer',
        emoji: '✍️',
        description: 'Content & copywriting',
        features: ['Content writing', 'Copywriting', 'Articles & blogs', 'Writing samples']
      }
    }
  },
  
  'tech-repair': {
    base: 'tech-repair',
    category: 'Technology',
    color: '#059669',
    defaultLayout: 'phone-repair',
    layouts: {
      'phone-repair': {
        name: 'Phone Repair',
        emoji: '📱',
        description: 'Mobile device specialist',
        features: ['iPhone/Android', 'Screen repair', 'Battery replacement', 'Quick turnaround']
      },
      'computer': {
        name: 'Computer Service',
        emoji: '💻',
        description: 'PC & laptop repair',
        features: ['PC/Mac repair', 'Upgrades', 'Data recovery', 'Virus removal']
      },
      'gaming': {
        name: 'Gaming Repair',
        emoji: '🎮',
        description: 'Console & gaming PC',
        features: ['Console repair', 'Gaming PC builds', 'Performance tuning', 'Gaming focused']
      }
    }
  },
  
  cleaning: {
    base: 'cleaning',
    category: 'Home Services',
    color: '#0891b2',
    defaultLayout: 'residential',
    layouts: {
      'residential': {
        name: 'Residential',
        emoji: '🏠',
        description: 'Home cleaning services',
        features: ['House cleaning', 'Deep cleaning', 'Move-in/out', 'Regular service']
      },
      'commercial': {
        name: 'Commercial',
        emoji: '🏢',
        description: 'Business cleaning',
        features: ['Office cleaning', 'Janitorial', 'After-hours', 'Contract cleaning']
      },
      'eco-friendly': {
        name: 'Eco-Friendly',
        emoji: '🌱',
        description: 'Green cleaning solutions',
        features: ['Non-toxic products', 'Eco-friendly', 'Safe for pets', 'Sustainable practices']
      }
    }
  },
  
  'pet-care': {
    base: 'pet-care',
    category: 'Pet Services',
    color: '#7c3aed',
    defaultLayout: 'dog-grooming',
    layouts: {
      'dog-grooming': {
        name: 'Dog Grooming',
        emoji: '🐕',
        description: 'Dog grooming specialist',
        features: ['Dog grooming', 'Breed expertise', 'Show cuts', 'Nail & teeth care']
      },
      'full-service': {
        name: 'Full Service',
        emoji: '🐾',
        description: 'All pet services',
        features: ['Dogs & cats', 'Grooming', 'Boarding', 'Daycare']
      },
      'mobile': {
        name: 'Mobile Grooming',
        emoji: '🚐',
        description: 'On-location service',
        features: ['Come to you', 'Stress-free', 'Mobile unit', 'Convenient scheduling']
      }
    }
  },
  
  electrician: {
    base: 'electrician',
    category: 'Home Services',
    color: '#f59e0b',
    defaultLayout: 'residential',
    layouts: {
      'residential': {
        name: 'Residential',
        emoji: '🏠',
        description: 'Home electrical services',
        features: ['Home wiring', 'Panel upgrades', 'Lighting', 'Outlets & switches']
      },
      'commercial': {
        name: 'Commercial',
        emoji: '🏢',
        description: 'Business electrical',
        features: ['Commercial wiring', 'Building codes', 'Emergency service', 'Maintenance contracts']
      },
      'smart-home': {
        name: 'Smart Home',
        emoji: '🤖',
        description: 'Home automation',
        features: ['Smart systems', 'Automation', 'Security systems', 'Tech integration']
      }
    }
  },
  
  'auto-repair': {
    base: 'auto-repair',
    category: 'Automotive',
    color: '#ef4444',
    defaultLayout: 'quick-service',
    layouts: {
      'quick-service': {
        name: 'Quick Service',
        emoji: '⚡',
        description: 'Fast oil changes & tires',
        features: ['Oil changes', 'Tire service', 'Quick repairs', 'No appointment needed']
      },
      'full-service': {
        name: 'Full Service',
        emoji: '🔧',
        description: 'Complete auto repair',
        features: ['All repairs', 'Diagnostics', 'ASE certified', 'All makes & models']
      },
      'performance': {
        name: 'Performance',
        emoji: '🏁',
        description: 'Tuning & upgrades',
        features: ['Performance tuning', 'Upgrades', 'Custom work', 'Racing prep']
      }
    }
  },
  
  plumbing: {
    base: 'plumbing',
    category: 'Home Services',
    color: '#3b82f6',
    defaultLayout: 'emergency',
    layouts: {
      'emergency': {
        name: 'Emergency Service',
        emoji: '🚨',
        description: '24/7 plumbing service',
        features: ['24/7 service', 'Emergency repairs', 'Fast response', 'Always available']
      },
      'renovation': {
        name: 'Renovation',
        emoji: '🛁',
        description: 'Remodeling focus',
        features: ['Bathroom remodels', 'Kitchen plumbing', 'New construction', 'Design & install']
      },
      'commercial': {
        name: 'Commercial',
        emoji: '🏢',
        description: 'Business plumbing',
        features: ['Commercial work', 'Maintenance plans', 'Building codes', 'Large projects']
      }
    }
  },
  
  'product-showcase': {
    base: 'product-showcase',
    category: 'Retail',
    color: '#f97316',
    defaultLayout: 'artisan',
    layouts: {
      'fashion': {
        name: 'Fashion Boutique',
        emoji: '👗',
        description: 'Clothing & accessories',
        features: ['Fashion items', 'Seasonal collections', 'Style guides', 'Lookbooks']
      },
      'home-goods': {
        name: 'Home Goods',
        emoji: '🏡',
        description: 'Home essentials',
        features: ['Home decor', 'Furniture', 'Kitchen items', 'Living space']
      },
      'artisan': {
        name: 'Artisan Crafts',
        emoji: '🎨',
        description: 'Handmade goods',
        features: ['Handcrafted', 'Unique items', 'Artisan made', 'One-of-a-kind']
      }
    }
  }
};

// Helper function to get layout info for a template
export function getLayoutInfo(templateId) {
  // Check if it's a layout variation (e.g., "restaurant-casual")
  const parts = templateId.split('-');
  if (parts.length < 2) return null;
  
  // Try to find matching base template
  const possibleBase = parts[0];
  if (TEMPLATE_LAYOUTS[possibleBase]) {
    const layoutKey = parts.slice(1).join('-');
    const config = TEMPLATE_LAYOUTS[possibleBase];
    if (config.layouts[layoutKey]) {
      return {
        base: possibleBase,
        layoutKey,
        layout: config.layouts[layoutKey],
        config
      };
    }
  }
  
  return null;
}

// Helper function to check if a base template has layouts
export function hasLayouts(baseTemplateId) {
  return !!TEMPLATE_LAYOUTS[baseTemplateId];
}

// Helper function to get all layouts for a base template
export function getLayoutsForTemplate(baseTemplateId) {
  return TEMPLATE_LAYOUTS[baseTemplateId] || null;
}

