/**
 * SiteSprintz Pricing Configuration
 * Comprehensive pricing, features, value propositions, and competitor comparisons
 */

export const PRICING_CONFIG = {
  // Trial period configuration (must match Stripe trial_period_days in payments.routes.js)
  trial: {
    duration: 7,
    durationUnit: 'days',
    features: 'starter',
    description: '7-day free trial when you publish — payment method required to start',
    paymentMethodRequired: true
  },

  // Pricing tiers with full details
  tiers: {
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 10,
      priceAnnual: 96, // $8/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Get found',
      description: 'A simple page for hours, menu, and how to reach you',
      
      // Short list for landing / comparison UIs
      summary: [
        'Your website + templates',
        'Contact form & shareable link',
        'Hours, menu, photos',
        'Bring your own domain'
      ],
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $144/year',
        detail: 'vs Wix Combo ($27/mo)'
      },
      
      // Core features
      features: [
        'Professional website',
        '14 industry-specific templates',
        'Contact forms with email notifications',
        'Mobile-responsive design',
        'SSL certificate (HTTPS)',
        'Shareable published site link',
        'Bring your own domain',
        'Service/product listings (display only)',
        'Basic booking / contact link',
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
        'No shopping cart or checkout',
        'No order management',
        'No embedded booking widget',
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
            'More templates (14 industries)',
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
        youPay: 10,
        savings: 35,
        savingsPercent: 78
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
      price: 35,
      priceAnnual: 336, // $28/month when paid annually
      billingPeriod: 'monthly',
      tagline: 'Get booked & paid',
      description: 'Everything in Starter, plus booking, cart, and Stripe checkout',
      
      // Short list for landing / comparison UIs
      summary: [
        'Everything in Starter',
        'Booking, cart & Stripe checkout'
      ],
      
      // Value badge for pricing card
      valueBadge: {
        title: 'Save $60/year',
        detail: 'vs separate booking tools'
      },
      
      // Core features — must match planFeatures.js GROWTH_FEATURES
      features: [
        'Everything in Starter, PLUS:',
        'Native booking widget',
        'Service & quote request forms',
        'Shopping cart & Stripe checkout',
        'Order & product management',
        'Basic + sales analytics',
        'Email notifications'
      ],
      
      // Soft limits (local-business scale — not hard product gates)
      limitations: [
        'Fair-use hosting for local business traffic'
      ],
      
      // Ideal customer profile
      idealFor: [
        'Service businesses taking bookings',
        'Salons and barbershops',
        'Food trucks and cafes',
        'Trades and contractors',
        'Shops ready for online checkout'
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
        totalMarketValue: 100,
        youPay: 35,
        savings: 65,
        savingsPercent: 65
      },
      
      // UI styling
      color: '#f59e0b',
      cta: 'Upgrade to Growth',
      available: true,
      popular: true
    }
  },
  // Overall value proposition
  valueProps: {
    noHiddenFees: 'No transaction fees, no hidden costs, no surprises',
    cancel: 'Cancel anytime, no long-term contracts',
    support: 'Email support for all plans',
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
    websiteBuilder: { starter: true, growth: true },
    templates: { starter: '14 industries', growth: '14 industries' },
    customDomain: { starter: 'Connect your own', growth: 'Connect your own' },
    ssl: { starter: true, growth: true },
    contactForms: { starter: true, growth: true },
    mobileResponsive: { starter: true, growth: true },
    paymentProcessing: { starter: false, growth: true },
    shoppingCart: { starter: false, growth: true },
    orderManagement: { starter: false, growth: true },
    bookingWidget: { starter: false, growth: true },
    serviceRequestForms: { starter: false, growth: true },
    analytics: { starter: false, growth: true },
    removeBranding: { starter: false, growth: false }
  }
};

// Export individual tier configs for easy access
export const STARTER_CONFIG = PRICING_CONFIG.tiers.starter;
export const GROWTH_CONFIG = PRICING_CONFIG.tiers.growth;

// Helper function to get tier by ID (legacy pro/premium → growth)
export function getTierConfig(tierId) {
  const aliases = { pro: 'growth', premium: 'growth', business: 'growth', enterprise: 'growth' };
  const id = aliases[tierId] || tierId;
  return PRICING_CONFIG.tiers[id] || null;
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

