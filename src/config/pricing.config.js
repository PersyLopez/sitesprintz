/**
 * SiteSprintz Pricing Configuration
 * Comprehensive pricing, features, value propositions, and competitor comparisons
 */

export const PRICING_CONFIG = {
  // Trial period configuration
  trial: {
    duration: 14,
    durationUnit: 'days',
    features: 'all',
    description: 'Try all features risk-free'
  },

  // Pricing tiers with full details
  tiers: {
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 15,
      priceAnnual: 144, // $12/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Perfect for service businesses',
      description: 'Get online fast with a professional website',
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $144/year',
        detail: 'vs Wix Combo ($27/mo)'
      },
      
      // Core features
      features: [
        'Professional website',
        '13 industry-specific templates',
        'Contact forms with email notifications',
        'Mobile-responsive design',
        'SSL certificate (HTTPS)',
        'Free subdomain (yoursite.sitesprintz.com)',
        'Service/product listings (display only)',
        'Pricing tables',
        'Photo galleries',
        'Google Maps integration',
        'Social media links',
        'Business hours display',
        'Testimonials section',
        'Custom theme colors',
        'Unlimited edits'
      ],
      
      // What's NOT included (limitations)
      limitations: [
        'No payment processing',
        'No order management',
        'No booking system',
        'No analytics dashboard'
      ],
      
      // Ideal customer profile
      idealFor: [
        'Service businesses',
        'Freelancers',
        'Local professionals',
        'Businesses that don\'t need online payments'
      ],
      
      // Competitor comparison
      competitors: {
        wix: {
          name: 'Wix Combo',
          price: 27,
          savings: 12,
          savingsPerYear: 144,
          advantages: [
            'Industry-specific templates (vs generic)',
            'Better performance and load times',
            'No hidden costs or upsells',
            'Cleaner, more modern code'
          ]
        },
        squarespace: {
          name: 'Squarespace Personal',
          price: 23,
          savings: 8,
          savingsPerYear: 96,
          advantages: [
            'More features included',
            'Better contact form handling',
            'Industry-optimized templates'
          ]
        },
        weebly: {
          name: 'Weebly Professional',
          price: 12,
          savings: -3,
          savingsPerYear: -36,
          advantages: [
            'More templates (13 industries)',
            'Better support',
            'Modern design system'
          ],
          note: '$3 more but significantly better value'
        }
      },
      
      // Value calculation
      valueBreakdown: {
        websiteBuilder: 15,
        hosting: 10,
        ssl: 5,
        templates: 10,
        forms: 5,
        totalMarketValue: 45,
        youPay: 15,
        savings: 30,
        savingsPercent: 67
      },
      
      // UI styling
      color: '#22c55e',
      cta: 'Get Started',
      available: true,
      popular: false
    },

    growth: {
      id: 'growth',
      name: 'Growth',
      price: 25,
      priceAnnual: 240, // $20/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Take bookings, collect cash',
      description: 'Everything in Starter, plus booking and request forms',
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $60/year',
        detail: 'vs separate booking tools'
      },
      
      // Core features (inherited + new)
      features: [
        'Everything in Starter, PLUS:',
        '✨ Native booking widget',
        '✨ Service request forms',
        '✨ Quote request system',
        '✨ Appointment scheduling',
        '✨ Email notifications',
        '✨ Basic analytics',
        '✨ Before/after galleries',
        '✨ Service filters'
      ],
      
      // What's NOT included (Pro features)
      limitations: [
        'No online payments',
        'No shopping cart',
        'No order management dashboard',
        'No Stripe integration'
      ],
      
      // Ideal customer profile
      idealFor: [
        'Service businesses taking cash',
        'Salons and barbershops',
        'Food trucks and cafes',
        'Trades and contractors',
        'Businesses wanting online booking'
      ],
      
      // Competitor comparison
      competitors: {
        calendly: {
          name: 'Calendly + Website',
          price: 40, // $20 Calendly + $20 website
          savings: 15,
          savingsPerYear: 180,
          advantages: [
            'Integrated booking (not separate tool)',
            'Industry-specific forms',
            'Better customization',
            'All-in-one solution'
          ]
        },
        acuity: {
          name: 'Acuity Scheduling + Website',
          price: 45, // $25 Acuity + $20 website
          savings: 20,
          savingsPerYear: 240,
          advantages: [
            'Native booking (not third-party)',
            'Custom request forms',
            'Better user experience',
            'No external dependencies'
          ]
        }
      },
      
      // Value calculation
      valueBreakdown: {
        websiteBuilder: 15,
        bookingSystem: 25,
        requestForms: 15,
        emailNotifications: 10,
        basicAnalytics: 10,
        totalMarketValue: 75,
        youPay: 25,
        savings: 50,
        savingsPercent: 67
      },
      
      // UI styling
      color: '#f59e0b',
      cta: 'Upgrade to Growth',
      available: true,
      popular: false
    },

    pro: {
      id: 'pro',
      name: 'Pro',
      price: 45,
      priceAnnual: 432, // $36/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Add payments and grow revenue',
      description: 'Everything in Starter, plus e-commerce and powerful business tools',
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $720/year',
        detail: 'vs Shopify Basic ($105/mo)'
      },
      
      // Core features (inherited + new)
      features: [
        'Everything in Starter, PLUS:',
        '✨ Stripe Connect payments',
        '✨ Shopping cart & checkout',
        '✨ Order management dashboard',
        '✨ Automated order confirmations',
        '✨ Customer email notifications',
        '✨ Embedded booking widget (Calendly)',
        '✨ Google Reviews integration',
        '✨ Analytics dashboard',
        '✨ Sales reports',
        '✨ 12 Pro templates with advanced features',
        'Product/service management',
        'Inventory tracking',
        'Discount codes',
        'Tax calculations',
        'Priority email support'
      ],
      
      // What's NOT included (Premium features)
      limitations: [
        'No native booking system',
        'No live chat widget',
        'No email automation',
        'No POS system'
      ],
      
      // Ideal customer profile
      idealFor: [
        'E-commerce businesses',
        'Restaurants with online ordering',
        'Service businesses accepting payments',
        'Growing businesses needing booking',
        'Product-based businesses'
      ],
      
      // Competitor comparison
      competitors: {
        wix: {
          name: 'Wix Business Basic + Bookings',
          price: 86, // $59 Business + $27 Bookings
          savings: 41,
          savingsPerYear: 492,
          advantages: [
            'Stripe Connect (no commission fees)',
            'Better e-commerce templates',
            'Integrated booking (not extra cost)',
            'Google Reviews built-in',
            'Analytics included'
          ]
        },
        squarespace: {
          name: 'Squarespace Commerce Basic',
          price: 49,
          savings: 4,
          savingsPerYear: 48,
          advantages: [
            'Stripe Connect (no transaction fees)',
            'Industry-specific templates',
            'Booking widget included',
            'Better analytics'
          ]
        },
        shopify: {
          name: 'Shopify Basic',
          price: 105,
          savings: 60,
          savingsPerYear: 720,
          advantages: [
            '57% cheaper than Shopify',
            'Includes booking (Shopify doesn\'t)',
            'Industry templates (Shopify is generic)',
            'Better for service businesses',
            'No transaction fees with Stripe Connect'
          ]
        },
        toast: {
          name: 'Toast Website + Online Ordering',
          price: 165, // $75 website + $90 ordering
          savings: 120,
          savingsPerYear: 1440,
          advantages: [
            '73% cheaper than Toast',
            'More flexible customization',
            'No commission on orders'
          ],
          note: 'For restaurants'
        }
      },
      
      // Value calculation
      valueBreakdown: {
        websiteBuilder: 15,
        ecommerce: 40,
        paymentProcessing: 50,
        bookingWidget: 30,
        analytics: 15,
        googleReviews: 20,
        orderManagement: 30,
        emailNotifications: 15,
        totalMarketValue: 215,
        youPay: 45,
        savings: 170,
        savingsPercent: 79
      },
      
      // ROI examples
      roiExamples: [
        {
          scenario: 'Restaurant with online ordering',
          monthlyOrders: 50,
          averageOrder: 45,
          monthlyRevenue: 2250,
          platformCost: 45,
          roi: '4900%',
          breakeven: 'First order'
        },
        {
          scenario: 'Service business with bookings',
          monthlyBookings: 20,
          averageBooking: 150,
          monthlyRevenue: 3000,
          platformCost: 45,
          roi: '6567%',
          breakeven: 'First booking'
        }
      ],
      
      // UI styling
      color: '#06b6d4',
      cta: 'Upgrade to Pro',
      available: true,
      popular: true, // Most popular tier
      badge: 'Most Popular'
    },

    premium: {
      id: 'premium',
      name: 'Premium',
      price: 100,
      priceAnnual: 960, // $80/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Full automation and advanced tools',
      description: 'Everything you need to run and scale your business',
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $1,440/year',
        detail: 'vs Separate SaaS Tools ($220/mo)'
      },
      
      // Core features (inherited + new)
      features: [
        'Everything in Pro, PLUS:',
        '🚀 Live chat widget',
        '🚀 Enhanced service filters',
        '🚀 Advanced hero sections',
        '🚀 Enhanced provider profiles',
        '🚀 Trust indicators & credentials',
        '🔮 Coming Q1 2026:',
        '  • Native booking system (replace Calendly)',
        '  • Email automation sequences',
        '  • Multi-step lead forms',
        '  • Client portal with status tracking',
        '  • Blog & CMS integration',
        '  • Interactive price calculators',
        '  • Service area mapping',
        'Multi-location support',
        'White-label option',
        'Custom domain included ($15/year value)',
        'Priority phone + chat support',
        'Dedicated account manager'
      ],
      
      // What's coming soon
      comingSoon: [
        'Native booking system (BookFlow)',
        'Advanced payment processing (PayStack)',
        'Email automation',
        'CRM integration',
        'Multi-step forms',
        'Client portal',
        'Blog/CMS'
      ],
      
      // Ideal customer profile
      idealFor: [
        'Multi-location businesses',
        'Growing service companies',
        'Businesses wanting full automation',
        'Premium brands',
        'Businesses needing white-label'
      ],
      
      // Competitor comparison
      competitors: {
        wix: {
          name: 'Wix Business VIP + Apps',
          price: 159, // $59 + $50 for apps + $50 for advanced features
          savings: 59,
          savingsPerYear: 708,
          advantages: [
            '37% cheaper than Wix premium',
            'All features included (no app marketplace)',
            'Better live chat',
            'Industry-specific focus',
            'No hidden costs'
          ]
        },
        squarespace: {
          name: 'Squarespace Commerce Advanced + Acuity',
          price: 98, // $65 Commerce + $33 Acuity
          savings: -2,
          savingsPerYear: -24,
          advantages: [
            'Native booking (vs third-party)',
            'More automation features',
            'Better multi-location support',
            'Live chat included',
            'Email automation'
          ],
          note: 'Slightly more but significantly more features'
        },
        shopify: {
          name: 'Shopify Plus (basic features)',
          price: 2000,
          savings: 1900,
          savingsPerYear: 22800,
          advantages: [
            '95% cheaper than Shopify Plus',
            'Better for service businesses',
            'All automation included'
          ],
          note: 'For enterprise comparison'
        },
        serviceBundle: {
          name: 'Individual SaaS tools',
          breakdown: {
            website: 45,
            booking: 30,
            liveChat: 25,
            emailAutomation: 50,
            crm: 40,
            analytics: 30,
            total: 220
          },
          savings: 120,
          savingsPerYear: 1440,
          advantages: [
            '55% cheaper than separate tools',
            'Integrated experience',
            'Single dashboard',
            'No integration headaches'
          ]
        }
      },
      
      // Value calculation
      valueBreakdown: {
        websiteBuilder: 15,
        ecommerce: 40,
        paymentProcessing: 50,
        nativeBooking: 50,
        liveChat: 30,
        emailAutomation: 60,
        crmIntegration: 50,
        multiLocation: 40,
        customDomain: 15,
        whiteLabel: 50,
        totalMarketValue: 400,
        youPay: 100,
        savings: 300,
        savingsPercent: 75
      },
      
      // ROI examples
      roiExamples: [
        {
          scenario: 'Service business with automation',
          monthlySales: 15000,
          timeSavedHours: 20,
          hourlyRate: 75,
          automationValue: 1500,
          platformCost: 100,
          roi: '1500%',
          breakeven: 'Day 2'
        },
        {
          scenario: 'Multi-location retail',
          locations: 3,
          avgRevenuePerLocation: 8000,
          totalRevenue: 24000,
          platformCost: 100,
          roi: '23900%',
          breakeven: 'First sale'
        }
      ],
      
      // Development status
      underDevelopment: true,
      releaseDate: 'Q1 2026',
      currentStatus: 'Core features available, advanced features coming soon',
      
      // UI styling
      color: '#8b5cf6',
      cta: 'Join Waitlist',
      available: false, // Some features still in development
      badge: 'Coming Soon',
      devBadge: '🚧 Under Development'
    }
  },

  // Overall value proposition
  valueProps: {
    noHiddenFees: 'No transaction fees, no hidden costs, no surprises',
    cancel: 'Cancel anytime, no long-term contracts',
    support: '24/7 support via email, priority for Pro/Premium',
    updates: 'Regular updates and new features included',
    guarantee: '30-day money-back guarantee'
  },

  // Savings calculator
  calculateSavings(tier, competitor = 'wix', period = 'monthly') {
    const tierConfig = this.tiers[tier];
    if (!tierConfig || !tierConfig.competitors[competitor]) {
      return null;
    }

    const comp = tierConfig.competitors[competitor];
    const multiplier = period === 'annual' ? 12 : 1;
    
    return {
      yourPrice: tierConfig.price * multiplier,
      competitorPrice: comp.price * multiplier,
      savings: comp.savings * multiplier,
      savingsPercent: Math.round((comp.savings / comp.price) * 100),
      period
    };
  },

  // Feature comparison matrix
  featureMatrix: {
    websiteBuilder: { starter: true, growth: true, pro: true, premium: true },
    templates: { starter: '13 base', growth: '13 base', pro: '12 pro', premium: '4 premium' },
    customDomain: { starter: 'Subdomain', growth: 'Subdomain', pro: 'Subdomain', premium: 'Included' },
    ssl: { starter: true, growth: true, pro: true, premium: true },
    contactForms: { starter: true, growth: true, pro: true, premium: true },
    mobileResponsive: { starter: true, growth: true, pro: true, premium: true },
    paymentProcessing: { starter: false, growth: false, pro: true, premium: true },
    shoppingCart: { starter: false, growth: false, pro: true, premium: true },
    orderManagement: { starter: false, growth: false, pro: true, premium: true },
    bookingWidget: { starter: false, growth: 'Native', pro: 'External', premium: 'Native' },
    serviceRequestForms: { starter: false, growth: true, pro: true, premium: true },
    googleReviews: { starter: false, growth: false, pro: true, premium: true },
    analytics: { starter: false, growth: 'Basic', pro: true, premium: true },
    liveChat: { starter: false, growth: false, pro: false, premium: true },
    emailAutomation: { starter: false, growth: false, pro: false, premium: true },
    multiLocation: { starter: false, growth: false, pro: false, premium: true },
    whiteLabel: { starter: false, growth: false, pro: false, premium: true }
  }
};

// Export individual tier configs for easy access
export const STARTER_CONFIG = PRICING_CONFIG.tiers.starter;
export const GROWTH_CONFIG = PRICING_CONFIG.tiers.growth;
export const PRO_CONFIG = PRICING_CONFIG.tiers.pro;
export const PREMIUM_CONFIG = PRICING_CONFIG.tiers.premium;

// Helper function to get tier by ID
export function getTierConfig(tierId) {
  return PRICING_CONFIG.tiers[tierId] || null;
}

// Helper function to compare two tiers
export function compareTiers(tierA, tierB) {
  const configA = getTierConfig(tierA);
  const configB = getTierConfig(tierB);
  
  if (!configA || !configB) return null;
  
  return {
    priceDifference: configB.price - configA.price,
    newFeatures: configB.features.length - configA.features.length,
    valueIncrease: configB.valueBreakdown.totalMarketValue - configA.valueBreakdown.totalMarketValue
  };
}

export default PRICING_CONFIG;

