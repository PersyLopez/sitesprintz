// Demo content generator for templates
// Provides realistic, rich content to showcase each template's potential
// 
// TEMPLATE TIERS:
// - Starter: Single-page, basic content (3-4 sections)
// - Pro: Single-page with advanced features (products, booking, payments)
// - Premium: Multi-page website with full navigation, subpages, galleries

export const generateDemoContent = (templateId) => {
  const baseTemplate = templateId.split('-')[0]; // e.g., 'restaurant' from 'restaurant-pro'
  const tier = templateId.includes('-premium') ? 'premium' 
             : templateId.includes('-pro') ? 'pro' 
             : 'starter';
  
  const demoContent = {
    // Restaurant Templates
    restaurant: {
      starter: {
        businessName: 'The Golden Spoon',
        tagline: 'Farm-to-table dining',
        heroTitle: 'Exquisite Cuisine',
        heroSubtitle: 'Experience culinary excellence with locally sourced ingredients',
        heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        
        services: [
          {
            id: '1',
            name: 'Lunch Menu',
            title: 'Lunch Menu',
            description: 'Fresh seasonal dishes served daily 11am-3pm',
            price: '$15-25',
          },
          {
            id: '2',
            name: 'Dinner Menu',
            title: 'Dinner Menu',
            description: 'Elegant evening dining with chef specialties',
            price: '$35-55',
          },
          {
            id: '3',
            name: 'Weekend Brunch',
            title: 'Weekend Brunch',
            description: 'Saturday and Sunday 10am-2pm',
            price: '$20-30',
          }
        ],
        
        contact: {
          email: 'info@goldenspoon.com',
          phone: '(555) 123-4567',
          address: '123 Culinary Avenue, Downtown, NY 10001',
          hours: 'Tue-Sun: 11am-10pm | Closed Monday'
        },
        
        social: {
          facebook: 'https://facebook.com/goldenspoondining',
          instagram: 'https://instagram.com/goldenspoon',
          maps: 'https://maps.google.com/?q=The+Golden+Spoon+Restaurant'
        },
        
        colors: {
          primary: '#D4AF37',
          accent: '#8B4513',
          background: '#ffffff'
        }
      },
      
      pro: {
        businessName: 'The Grand Table',
        tagline: 'Modern American Cuisine • Elevated Dining Experience',
        heroTitle: 'An Unforgettable Culinary Journey',
        heroSubtitle: 'Experience modern American cuisine crafted with passion and presented with artistry. Our seasonal menus showcase the finest local ingredients, complemented by an extensive wine collection and impeccable service.',
        heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        
        // Navigation structure
        nav: [
          { label: 'Menus', href: '#menu' },
          { label: 'Private Dining', href: '#private' },
          { label: 'Reservations', href: '#booking' },
          { label: 'Gallery', href: '#gallery' },
          { label: 'Contact', href: '#contact' }
        ],
        
        // Full menu with multiple sections
        menu: {
          sections: [
            {
              id: 'appetizers',
              name: 'Appetizers',
              description: 'Perfect starters to begin your culinary journey',
              items: [
                {
                  name: 'Tuna Tartare',
                  price: 18,
                  description: 'Fresh ahi tuna, avocado, sesame, wonton crisps, yuzu aioli',
                  image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600',
                  dietary: ['Pescatarian'],
                  popular: true
                },
                {
                  name: 'Burrata & Heirloom Tomatoes',
                  price: 16,
                  description: 'Creamy burrata, heirloom tomatoes, basil, aged balsamic, sourdough',
                  image: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=600',
                  dietary: ['Vegetarian'],
                  popular: true
                },
                {
                  name: 'Wagyu Beef Carpaccio',
                  price: 22,
                  description: 'Thinly sliced wagyu, arugula, truffle aioli, parmesan, capers',
                  image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600'
                },
                {
                  name: 'Lobster Bisque',
                  price: 14,
                  description: 'Rich lobster bisque, cognac cream, herb oil, crusty bread',
                  image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600',
                  dietary: ['Pescatarian']
                }
              ]
            },
            {
              id: 'entrees',
              name: 'Entrées',
              description: 'Our signature main courses',
              items: [
                {
                  name: 'Pan-Seared Halibut',
                  price: 42,
                  description: 'Wild-caught halibut, roasted fennel, citrus beurre blanc, microgreens',
                  image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
                  dietary: ['Pescatarian', 'Gluten-Free'],
                  popular: true,
                  chefRecommended: true
                },
                {
                  name: 'Dry-Aged Ribeye',
                  price: 58,
                  description: '45-day dry-aged ribeye, truffle mashed potatoes, asparagus, red wine reduction',
                  image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600',
                  dietary: ['Gluten-Free'],
                  popular: true,
                  chefRecommended: true
                },
                {
                  name: 'Duck Confit',
                  price: 38,
                  description: 'Slow-cooked duck leg, wild mushroom risotto, cherry gastrique',
                  image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=600',
                  dietary: ['Gluten-Free']
                },
                {
                  name: 'Mushroom Wellington',
                  price: 34,
                  description: 'Wild mushroom duxelles, puff pastry, red wine jus, roasted vegetables',
                  image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
                  dietary: ['Vegetarian'],
                  chefRecommended: true
                },
                {
                  name: 'Chilean Sea Bass',
                  price: 46,
                  description: 'Miso-glazed sea bass, forbidden rice, bok choy, ginger-soy reduction',
                  image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
                  dietary: ['Pescatarian']
                },
                {
                  name: 'Rack of Lamb',
                  price: 52,
                  description: 'Herb-crusted lamb rack, rosemary potatoes, mint chimichurri',
                  image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=600',
                  dietary: ['Gluten-Free']
                }
              ]
            },
            {
              id: 'desserts',
              name: 'Desserts',
              description: 'Sweet endings crafted by our pastry chef',
              items: [
                {
                  name: 'Chocolate Soufflé',
                  price: 14,
                  description: 'Dark chocolate soufflé, vanilla bean ice cream, raspberry coulis (20min)',
                  image: 'https://images.unsplash.com/photo-1606312619470-d9f6a79a6f5f?w=600',
                  dietary: ['Vegetarian'],
                  popular: true
                },
                {
                  name: 'Crème Brûlée Trio',
                  price: 12,
                  description: 'Classic vanilla, lavender honey, espresso - choose one or try all three',
                  image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=600',
                  dietary: ['Vegetarian', 'Gluten-Free']
                },
                {
                  name: 'Seasonal Tart',
                  price: 11,
                  description: 'Chef\'s selection of seasonal fruit tart, vanilla chantilly',
                  image: 'https://images.unsplash.com/photo-1519915212116-7cfef71f1d3e?w=600',
                  dietary: ['Vegetarian']
                },
                {
                  name: 'Cheese Selection',
                  price: 16,
                  description: 'Artisan cheese board, house-made preserves, candied nuts, crackers',
                  image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600',
                  dietary: ['Vegetarian']
                }
              ]
            },
            {
              id: 'beverages',
              name: 'Beverages',
              description: 'Curated wine list and craft cocktails',
              items: [
                {
                  name: 'Sommelier Wine Pairing',
                  price: 45,
                  description: 'Four wines expertly paired with your meal by our sommelier',
                  category: 'Wine',
                  popular: true
                },
                {
                  name: 'Signature Old Fashioned',
                  price: 16,
                  description: 'Bourbon, house-made bitters, orange zest, luxardo cherry',
                  category: 'Cocktails',
                  popular: true
                },
                {
                  name: 'French 75',
                  price: 15,
                  description: 'Gin, lemon, champagne, served in a champagne flute',
                  category: 'Cocktails'
                },
                {
                  name: 'Negroni Sbagliato',
                  price: 14,
                  description: 'Campari, sweet vermouth, prosecco, orange twist',
                  category: 'Cocktails'
                }
              ]
            }
          ]
        },
        
        // About section
        about: {
          title: 'Our Story',
          body: 'The Grand Table opened in 2015 with a vision: create an elevated dining experience that celebrates American cuisine through a modern lens. Our award-winning chef, James Chen, brings together classical techniques and innovative flavors, sourcing ingredients from local farms and artisan producers.',
          subtitle: 'What sets us apart',
          features: [
            '🏆 Michelin Guide Recommended',
            '🌱 Farm-to-table philosophy',
            '🍷 200+ bottle wine cellar',
            '👨‍🍳 Award-winning chef',
            '✨ White-glove service',
            '🎨 Artistic presentation'
          ]
        },
        
        // Chef's specials
        chefSpecials: {
          title: 'Chef\'s Weekly Specials',
          subtitle: 'Limited-time creations from our culinary team',
          items: [
            {
              name: 'Diver Scallops',
              price: 44,
              description: 'Pan-seared day-boat scallops, cauliflower purée, brown butter, capers',
              availability: 'This Week Only',
              image: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=600'
            },
            {
              name: 'Wild Boar Ragu',
              price: 36,
              description: 'Slow-braised wild boar, pappardelle, parmesan, herbs',
              availability: 'This Week Only',
              image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600'
            }
          ]
        },
        
        // Private events
        privateEvents: {
          title: 'Private Dining & Events',
          subtitle: 'Exclusive experiences for your special occasions',
          rooms: [
            {
              name: 'The Wine Room',
              capacity: '8-12 guests',
              description: 'Intimate dining surrounded by our wine collection. Perfect for business dinners and celebrations.',
              features: ['Private sommelier', 'Custom menu', 'AV equipment'],
              image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600'
            },
            {
              name: 'The Chef\'s Table',
              capacity: '2-6 guests',
              description: 'Dine in the kitchen and watch our culinary team at work. An unforgettable experience.',
              features: ['Kitchen view', 'Chef interaction', 'Tasting menu'],
              image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600'
            },
            {
              name: 'The Grand Room',
              capacity: '20-40 guests',
              description: 'Our main private dining room for weddings, corporate events, and large celebrations.',
              features: ['Full buyout option', 'Custom menu', 'Event coordinator'],
              image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600'
            }
          ]
        },
        
        // Gallery
        gallery: {
          title: 'Experience The Grand Table',
          categories: [
            {
              name: 'Food',
              images: [
                { url: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800', alt: 'Plated dish' },
                { url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', alt: 'Gourmet meal' },
                { url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800', alt: 'Chef creation' }
              ]
            },
            {
              name: 'Ambiance',
              images: [
                { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', alt: 'Restaurant interior' },
                { url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', alt: 'Dining area' },
                { url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800', alt: 'Table setting' }
              ]
            },
            {
              name: 'Events',
              images: [
                { url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800', alt: 'Private event' },
                { url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800', alt: 'Celebration dinner' },
                { url: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=800', alt: 'Wine dinner' }
              ]
            }
          ]
        },
        
        // Team profiles
        team: {
          title: 'Our Culinary Team',
          subtitle: 'Led by award-winning talent',
          members: [
            {
              name: 'James Chen',
              title: 'Executive Chef & Owner',
              bio: 'With over 20 years of culinary experience, Chef Chen has trained in Michelin-starred kitchens across the US and Europe. His modern American cuisine celebrates seasonal ingredients and refined techniques.',
              image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400',
              credentials: ['James Beard Nominee', 'Michelin-Trained', 'Best Chef 2022']
            },
            {
              name: 'Sophie Laurent',
              title: 'Pastry Chef',
              bio: 'Trained at Le Cordon Bleu in Paris, Chef Laurent brings French pastry excellence to The Grand Table. Her seasonal desserts are works of art.',
              image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
              credentials: ['Le Cordon Bleu', 'Pastry Excellence Award']
            },
            {
              name: 'Marcus Williams',
              title: 'Head Sommelier',
              bio: 'With certifications from the Court of Master Sommeliers, Marcus curates our wine program and creates perfect pairings for every dish.',
              image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400',
              credentials: ['Advanced Sommelier', 'Wine Spectator Award']
            }
          ]
        },
        
        // Testimonials
        testimonials: {
          title: 'Guest Reviews',
          subtitle: 'What our guests are saying',
          items: [
            {
              text: 'An exceptional dining experience from start to finish. The halibut was perfectly cooked and the wine pairing was spot-on. Can\'t wait to return!',
              author: 'Alexandra Reed',
              location: 'Food Critic',
              rating: 5,
              date: '2 days ago',
              image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100'
            },
            {
              text: 'Celebrated our anniversary at The Grand Table and it was perfect. The chef\'s table experience is a must-try. Impeccable service and incredible food.',
              author: 'Michael & Sarah Thompson',
              location: 'Anniversary Celebration',
              rating: 5,
              date: '1 week ago',
              image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
            },
            {
              text: 'The best fine dining experience in the city. Every course was beautifully presented and delicious. The sommelier\'s recommendations were excellent.',
              author: 'David Chen',
              location: 'Wine Enthusiast',
              rating: 5,
              date: '2 weeks ago',
              image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
            }
          ],
          stats: {
            averageRating: 4.9,
            totalReviews: 347,
            googleRating: 4.9,
            michelinStatus: 'Recommended'
          }
        },
        
        // Stats
        stats: {
          items: [
            { number: '4.9', label: 'Star Rating' },
            { number: '8+', label: 'Years Excellence' },
            { number: '200+', label: 'Wine Selection' },
            { number: 'Michelin', label: 'Recommended' }
          ]
        },
        
        // Credentials
        credentials: {
          title: 'Awards & Recognition',
          items: [
            { icon: '🏆', name: 'Michelin Recommended', description: '2020-2024' },
            { icon: '⭐', name: 'James Beard Nominee', description: 'Best Chef' },
            { icon: '🍷', name: 'Wine Spectator', description: 'Award of Excellence' },
            { icon: '📰', name: 'SF Chronicle', description: 'Top 50 Restaurants' }
          ]
        },
        
        // FAQ
        faq: {
          title: 'Frequently Asked Questions',
          items: [
            { question: 'Do you require reservations?', answer: 'Reservations are strongly recommended. We accept walk-ins based on availability, but we often book up, especially on weekends.' },
            { question: 'What is your dress code?', answer: 'Business casual or above. We kindly ask that guests avoid athletic wear, shorts, and flip-flops.' },
            { question: 'Do you accommodate dietary restrictions?', answer: 'Absolutely. Please inform us of any allergies or dietary needs when booking. Our chef can create custom dishes for vegetarian, vegan, gluten-free, and other requirements.' },
            { question: 'Can I host a private event?', answer: 'Yes! We have three private dining spaces accommodating 2-40 guests. Contact us for availability and custom menu options.' },
            { question: 'What is the Chef\'s Table experience?', answer: 'Dine in our kitchen alongside the culinary team. This intimate 2-6 person experience includes a custom tasting menu and wine pairing.' },
            { question: 'Do you offer wine pairings?', answer: 'Yes! Our sommelier offers curated wine pairings with your meal. Choose from our 4-course pairing or discuss custom options.' },
            { question: 'Is valet parking available?', answer: 'Yes, complimentary valet parking is available Tuesday-Saturday evenings.' },
            { question: 'Can I purchase gift certificates?', answer: 'Yes! Gift certificates are available for purchase online or by calling us.' }
          ]
        },
        
        // Services for backwards compatibility
        services: [
          {
            id: '1',
            name: 'Fine Dining',
            title: 'Fine Dining Experience',
            description: 'Multi-course tasting menu featuring seasonal ingredients',
            price: '$85 per person',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
          },
          {
            id: '2',
            name: 'Private Events',
            title: 'Private Events',
            description: 'Exclusive venue rental for special celebrations',
            price: 'From $2,500',
            image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'
          },
          {
            id: '3',
            name: 'Chef\'s Table',
            title: 'Chef\'s Table',
            description: 'Intimate experience at our exclusive chef\'s table',
            price: '$150 per person',
            image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
          },
          {
            id: '4',
            name: 'Catering',
            title: 'Premium Catering',
            description: 'Premium catering for events of all sizes',
            price: 'Custom pricing',
            image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800'
          }
        ],
        
        // Products for e-commerce
        products: [
          {
            id: 'p1',
            name: 'Signature Truffle Risotto',
            description: 'Creamy Arborio rice with black truffle, parmesan, and fresh herbs',
            price: 3200,
            image: 'https://images.unsplash.com/photo-1476124369491-c11b2ab6d329?w=600',
            category: 'Entrees'
          },
          {
            id: 'p2',
            name: 'Dry-Aged Ribeye',
            description: '45-day dry-aged ribeye with truffle mashed potatoes',
            price: 5800,
            image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600',
            category: 'Entrees'
          },
          {
            id: 'p3',
            name: 'Pan-Seared Halibut',
            description: 'Wild-caught halibut with citrus beurre blanc',
            price: 4200,
            image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
            category: 'Seafood'
          },
          {
            id: 'p4',
            name: 'Sommelier Wine Pairing',
            description: 'Four wines expertly paired with your meal',
            price: 4500,
            image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600',
            category: 'Experiences'
          }
        ],
        
        // Contact
        contact: {
          title: 'Visit Us',
          subtitle: 'Reservations recommended',
          email: 'reservations@thegrandtable.com',
          phone: '(555) 789-0123',
          address: '425 Grand Avenue, Downtown, San Francisco, CA 94102',
          hours: 'Tue-Thu: 5:30pm-10pm | Fri-Sat: 5:30pm-11pm | Sun: 5pm-9pm | Mon: Closed',
          parking: 'Valet parking available • Nearby garage parking',
          accessibility: 'Fully wheelchair accessible • Elevator access'
        },
        
        // Social
        social: {
          facebook: 'https://facebook.com/thegrandtable',
          instagram: 'https://instagram.com/thegrandtable',
          twitter: 'https://twitter.com/thegrandtable',
          maps: 'https://maps.google.com/?q=The+Grand+Table+Restaurant',
          yelp: 'https://yelp.com/biz/thegrandtable'
        },
        
        // Colors
        colors: {
          primary: '#D4AF37',
          accent: '#B8941E',
          background: '#1a1a1a'
        },
        
        // Features config
        features: {
          bookingWidget: {
            enabled: true,
            provider: 'calendly',
            url: 'https://calendly.com/thegrandtable'
          },
          tabbedMenu: true,
          ownerDashboard: true,
          analytics: true,
          gallery: {
            filterable: true,
            categories: ['Food', 'Ambiance', 'Events']
          },
          privateEvents: {
            enabled: true,
            modal: true
          }
        },
        
        // Settings
        settings: {
          allowCheckout: false,
          allowOrders: false,
          bookingEnabled: true,
          bookingWidget: 'calendly',
          tier: 'Pro'
        }
      },
      
      premium: {
        businessName: 'The Golden Spoon Restaurant & Bar',
        tagline: 'Award-winning farm-to-table dining experience',
        heroTitle: 'Exquisite Cuisine, Unforgettable Moments',
        heroSubtitle: 'Experience culinary excellence with locally sourced ingredients, award-winning chefs, and an extensive wine collection',
        heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
        
        // Premium: Multi-page structure
        pages: [
          { id: 'home', title: 'Home', path: '/' },
          { id: 'menu', title: 'Our Menu', path: '/menu' },
          { id: 'events', title: 'Private Events', path: '/events' },
          { id: 'about', title: 'About Us', path: '/about' },
          { id: 'chefs', title: 'Our Chefs', path: '/chefs' },
          { id: 'gallery', title: 'Gallery', path: '/gallery' },
          { id: 'reservations', title: 'Reservations', path: '/reservations' },
          { id: 'contact', title: 'Contact', path: '/contact' }
        ],
        
        // Menu page content
        menuSections: [
          {
            id: 'appetizers',
            name: 'Appetizers',
            items: [
              { name: 'Seared Scallops', description: 'Pan-seared diver scallops with cauliflower purée and caviar', price: '$24' },
              { name: 'Foie Gras Terrine', description: 'House-made terrine with brioche and fig compote', price: '$28' },
              { name: 'Oysters Rockefeller', description: 'Fresh oysters with spinach, bacon, and Pernod', price: '$22' }
            ]
          },
          {
            id: 'entrees',
            name: 'Entrees',
            items: [
              { name: 'Wagyu Beef Wellington', description: 'Japanese Wagyu wrapped in puff pastry with foie gras', price: '$85' },
              { name: 'Pan-Roasted Halibut', description: 'Wild halibut with saffron risotto and lobster sauce', price: '$54' },
              { name: 'Duck Confit', description: 'Crispy duck leg with cherry gastrique and potato gratin', price: '$48' },
              { name: 'Truffle Risotto', description: 'Creamy Arborio rice with black truffle and parmesan', price: '$42' }
            ]
          },
          {
            id: 'desserts',
            name: 'Desserts',
            items: [
              { name: 'Chocolate Soufflé', description: 'Dark chocolate soufflé with vanilla bean ice cream', price: '$16' },
              { name: 'Crème Brûlée', description: 'Classic French custard with caramelized sugar', price: '$14' },
              { name: 'Seasonal Tart', description: 'Chef\'s selection of fresh fruit tart', price: '$15' }
            ]
          }
        ],
        
        // Team/Chefs page
        team: [
          {
            id: 'chef1',
            name: 'Chef Michael Laurent',
            role: 'Executive Chef',
            bio: 'Michelin-starred chef with 20 years of experience in French cuisine',
            image: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600',
            specialty: 'French & Contemporary'
          },
          {
            id: 'chef2',
            name: 'Chef Sarah Chen',
            role: 'Sous Chef',
            bio: 'Culinary Institute graduate specializing in Asian fusion',
            image: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=600',
            specialty: 'Asian Fusion'
          },
          {
            id: 'chef3',
            name: 'Chef Marcus Rodriguez',
            role: 'Pastry Chef',
            bio: 'Award-winning pastry chef trained in Paris',
            image: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=600',
            specialty: 'Pastry & Desserts'
          }
        ],
        
        // Gallery
        gallery: [
          { id: 'g1', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', caption: 'Signature dishes' },
          { id: 'g2', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', caption: 'Elegant dining room' },
          { id: 'g3', image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800', caption: 'Wine cellar' },
          { id: 'g4', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', caption: 'Chef\'s table' },
          { id: 'g5', image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800', caption: 'Private dining' },
          { id: 'g6', image: 'https://images.unsplash.com/photo-1476124369491-c11b2ab6d329?w=800', caption: 'Gourmet plating' }
        ],
        
        // About content
        about: {
          story: 'Founded in 2010 by Chef Michael Laurent, The Golden Spoon has become a cornerstone of fine dining in the city. Our commitment to farm-to-table excellence and innovative cuisine has earned us numerous accolades.',
          mission: 'To provide an unforgettable dining experience through exceptional cuisine, impeccable service, and a warm, elegant atmosphere.',
          awards: [
            'Michelin Star - 2018, 2019, 2020, 2021, 2022',
            'James Beard Award Finalist - Best Chef Northeast',
            'Wine Spectator Grand Award - 5 consecutive years',
            'Forbes Five-Star Restaurant'
          ]
        },
        
        services: [
          {
            id: '1',
            name: 'Fine Dining',
            title: 'Fine Dining Experience',
            description: 'Multi-course tasting menu featuring seasonal ingredients and innovative techniques from our award-winning kitchen',
            price: '$95 per person',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
          },
          {
            id: '2',
            name: 'Private Events',
            title: 'Private Events & Celebrations',
            description: 'Exclusive venue rental for weddings, corporate events, and special celebrations with customized menus',
            price: 'From $5,000',
            image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'
          },
          {
            id: '3',
            name: 'Chef\'s Table',
            title: 'Chef\'s Table Experience',
            description: 'Intimate 10-course experience at our exclusive chef\'s table with wine pairings and kitchen tour',
            price: '$195 per person',
            image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'
          },
          {
            id: '4',
            name: 'Wine Tasting',
            title: 'Wine Tasting Events',
            description: 'Monthly wine tasting events featuring rare vintages from our 500+ bottle collection',
            price: '$75 per person',
            image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'
          },
          {
            id: '5',
            name: 'Cooking Classes',
            title: 'Culinary Classes',
            description: 'Learn from our Michelin-starred chefs in hands-on cooking workshops',
            price: '$150 per person',
            image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800'
          },
          {
            id: '6',
            name: 'Catering',
            title: 'Premium Catering',
            description: 'Off-site catering for events of all sizes with full-service options',
            price: 'Custom pricing',
            image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800'
          }
        ],
        
        products: [
          {
            id: 'p1',
            name: 'Signature Truffle Risotto',
            description: 'Creamy Arborio rice with black truffle, parmesan, and fresh herbs',
            price: 3200,
            image: 'https://images.unsplash.com/photo-1476124369491-c11b2ab6d329?w=600',
            category: 'Entrees'
          },
          {
            id: 'p2',
            name: 'Wagyu Beef Wellington',
            description: 'Prime Japanese Wagyu wrapped in puff pastry with foie gras',
            price: 8500,
            image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600',
            category: 'Entrees'
          },
          {
            id: 'p3',
            name: 'Lobster Thermidor',
            description: 'Fresh Maine lobster in brandy cream sauce with aged Gruyère',
            price: 4800,
            image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=600',
            category: 'Seafood'
          },
          {
            id: 'p4',
            name: 'Chef\'s Tasting Menu',
            description: '10-course seasonal menu with wine pairings',
            price: 19500,
            image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600',
            category: 'Experiences'
          },
          {
            id: 'p5',
            name: 'Gift Certificate - $200',
            description: 'Perfect gift for the food lover, valid for one year',
            price: 20000,
            image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600',
            category: 'Gift Cards'
          },
          {
            id: 'p6',
            name: 'Private Chef Experience',
            description: 'Chef comes to your home for intimate dinner party (up to 8 guests)',
            price: 150000,
            image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600',
            category: 'Experiences'
          }
        ],
        
        contact: {
          email: 'reservations@goldenspoon.com',
          phone: '(555) 123-4567',
          address: '123 Culinary Avenue, Downtown District, NY 10001',
          hours: 'Tue-Sat: 5pm-11pm | Sun: 11am-3pm (Brunch), 5pm-10pm | Closed Monday'
        },
        
        social: {
          facebook: 'https://facebook.com/goldenspoondining',
          instagram: 'https://instagram.com/goldenspoon',
          twitter: 'https://twitter.com/goldenspoon',
          maps: 'https://maps.google.com/?q=The+Golden+Spoon+Restaurant',
          youtube: 'https://youtube.com/@goldenspoon'
        },
        
        colors: {
          primary: '#D4AF37',
          accent: '#8B4513',
          background: '#0a0a0a'
        }
      }
    },

    // Salon Templates
    salon: {
      starter: {
        businessName: 'Beauty Studio',
        tagline: 'Hair & Beauty Services',
        heroTitle: 'Transform Your Look',
        heroSubtitle: 'Professional hair and beauty services in a welcoming environment',
        heroImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
        
        services: [
          {
            id: '1',
            name: 'Haircut',
            title: 'Haircut',
            description: 'Professional cut and style',
            price: '$45-65'
          },
          {
            id: '2',
            name: 'Color',
            title: 'Hair Color',
            description: 'Full color or highlights',
            price: '$85-150'
          },
          {
            id: '3',
            name: 'Styling',
            title: 'Styling',
            description: 'Blowout and special occasion styling',
            price: '$35-75'
          }
        ],
        
        contact: {
          email: 'hello@beautystudio.com',
          phone: '(555) 234-5678',
          address: '456 Style Street, Downtown, CA 90001',
          hours: 'Tue-Sat: 9am-7pm | Sun: 10am-5pm | Mon: Closed'
        },
        
        social: {
          facebook: 'https://facebook.com/beautystudio',
          instagram: 'https://instagram.com/beautystudio',
          maps: 'https://maps.google.com/?q=Beauty+Studio'
        },
        
        colors: {
          primary: '#A855F7',
          accent: '#9333EA',
          background: '#ffffff'
        }
      },
      
      pro: {
        businessName: 'Luxe Beauty Studio',
        tagline: 'Premium Hair & Beauty Services • Transformative Experiences',
        heroTitle: 'Where Beauty Meets Artistry',
        heroSubtitle: 'Experience transformative hair and beauty services in our modern, luxurious studio. Our expert stylists and aestheticians bring your vision to life with precision, creativity, and personalized care.',
        heroImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200',
        
        nav: [
          { label: 'Services', href: '#services' },
          { label: 'Gallery', href: '#gallery' },
          { label: 'Team', href: '#team' },
          { label: 'Book Now', href: '#booking' },
          { label: 'Contact', href: '#contact' }
        ],
        
        menu: {
          sections: [
            {
              id: 'hair-styling',
              name: 'Hair Styling',
              description: 'Expert cuts and styling for all hair types',
              items: [
                {
                  name: 'Signature Haircut',
                  price: 85,
                  description: 'Precision cut with consultation, shampoo, style, and finishing products',
                  image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600',
                  duration: '60 min',
                  popular: true
                },
                {
                  name: 'Blowout & Style',
                  price: 55,
                  description: 'Luxurious shampoo, conditioning treatment, and professional blowout',
                  image: 'https://images.unsplash.com/photo-1522337094846-8a818192de1f?w=600',
                  duration: '45 min',
                  popular: true
                },
                {
                  name: 'Keratin Treatment',
                  price: 250,
                  description: 'Smoothing keratin treatment for frizz-free, manageable hair (lasts 3-5 months)',
                  image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600',
                  duration: '3 hours'
                },
                {
                  name: 'Updo Styling',
                  price: 95,
                  description: 'Elegant updo for special occasions, includes consultation',
                  image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=600',
                  duration: '90 min'
                }
              ]
            },
            {
              id: 'color-services',
              name: 'Color Services',
              description: 'Custom color treatments by certified colorists',
              items: [
                {
                  name: 'Full Color',
                  price: 125,
                  description: 'All-over color with premium products, includes toner and gloss',
                  image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600',
                  duration: '2 hours',
                  popular: true
                },
                {
                  name: 'Balayage Highlights',
                  price: 195,
                  description: 'Hand-painted highlights for natural, sun-kissed dimension',
                  image: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600',
                  duration: '3 hours',
                  popular: true
                },
                {
                  name: 'Ombré/Sombré',
                  price: 215,
                  description: 'Gradient color technique with seamless transitions',
                  image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600',
                  duration: '3.5 hours'
                },
                {
                  name: 'Color Correction',
                  price: 300,
                  description: 'Expert correction for previous color mishaps (consultation required)',
                  image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600',
                  duration: '4-6 hours'
                }
              ]
            },
            {
              id: 'extensions',
              name: 'Extensions & Enhancements',
              description: 'Premium hair extensions and volumizing services',
              items: [
                {
                  name: 'Tape-In Extensions',
                  price: 650,
                  description: '100g of premium Remy hair, includes installation and styling',
                  image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600',
                  duration: '2-3 hours'
                },
                {
                  name: 'K-Tip Extensions',
                  price: 850,
                  description: 'Individual keratin bond extensions for maximum natural look',
                  image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600',
                  duration: '4 hours'
                },
                {
                  name: 'Extension Maintenance',
                  price: 125,
                  description: 'Move-up service for tape-ins (every 6-8 weeks)',
                  duration: '90 min'
                }
              ]
            },
            {
              id: 'bridal',
              name: 'Bridal Services',
              description: 'Complete bridal beauty packages for your special day',
              items: [
                {
                  name: 'Bridal Hair Trial',
                  price: 125,
                  description: 'Pre-wedding trial with consultation and style testing',
                  image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=600',
                  duration: '2 hours',
                  popular: true
                },
                {
                  name: 'Bridal Day Hair',
                  price: 185,
                  description: 'Wedding day styling with touch-ups and veil placement',
                  image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600',
                  duration: '90 min'
                },
                {
                  name: 'Bridal Party Hair',
                  price: 95,
                  description: 'Styling for bridesmaids and family (per person)',
                  duration: '60 min'
                },
                {
                  name: 'Complete Bridal Package',
                  price: 450,
                  description: 'Trial + Wedding Day + Touch-up Kit + Bride\'s gift',
                  popular: true
                }
              ]
            }
          ]
        },
        
        about: {
          title: 'Our Story',
          body: 'Luxe Beauty Studio opened in 2018 with a passion for empowering people through transformative beauty services. Our team of award-winning stylists brings together cutting-edge techniques, premium products, and personalized care to create stunning results.',
          subtitle: 'Why choose Luxe',
          features: [
            '🏆 Award-Winning Stylists',
            '💎 Premium Product Lines',
            '🎨 Custom Color Expertise',
            '👑 Bridal Specialists',
            '✨ Luxurious Environment',
            '📚 Ongoing Education'
          ]
        },
        
        team: {
          title: 'Meet Our Stylists',
          subtitle: 'Expert professionals dedicated to your beauty',
          members: [
            {
              name: 'Sarah Williams',
              title: 'Master Colorist & Owner',
              bio: 'With 15 years of experience and advanced color certifications, Sarah specializes in balayage, color correction, and custom color formulations.',
              image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
              credentials: ['Redken Certified Colorist', 'Balayage Specialist']
            },
            {
              name: 'Alex Rodriguez',
              title: 'Lead Stylist',
              bio: 'Alex is a precision cutting expert known for creating beautiful, wearable styles that fit each client\'s lifestyle.',
              image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
              credentials: ['Vidal Sassoon Trained', 'Curly Hair Specialist']
            },
            {
              name: 'Maya Patel',
              title: 'Extension & Bridal Specialist',
              bio: 'Maya is our go-to expert for extensions and bridal styling with certifications in multiple extension methods.',
              image: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400',
              credentials: ['Extension Certified', 'Bridal Specialist']
            }
          ]
        },
        
        gallery: {
          title: 'Our Work',
          subtitle: 'Transformations that inspire',
          categories: [
            {
              name: 'Hair',
              images: [
                { url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800', alt: 'Haircut transformation' },
                { url: 'https://images.unsplash.com/photo-1522337094846-8a818192de1f?w=800', alt: 'Styled hair' },
                { url: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800', alt: 'Long hair styling' }
              ]
            },
            {
              name: 'Color',
              images: [
                { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800', alt: 'Balayage highlights' },
                { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800', alt: 'Ombre coloring' },
                { url: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800', alt: 'Color transformation' }
              ]
            },
            {
              name: 'Bridal',
              images: [
                { url: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800', alt: 'Bridal updo' },
                { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800', alt: 'Wedding hair' },
                { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', alt: 'Bridal styling' }
              ]
            }
          ]
        },
        
        testimonials: {
          title: 'Client Reviews',
          subtitle: 'What our clients are saying',
          items: [
            {
              text: 'I\'ve been going to Luxe for 2 years and wouldn\'t trust my hair to anyone else! Sarah is a color genius.',
              author: 'Emily Martinez',
              location: 'Regular Client',
              rating: 5,
              date: '3 days ago',
              image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100'
            },
            {
              text: 'Had my bridal hair here - absolutely perfect! They made me feel like a princess.',
              author: 'Jessica Park',
              location: 'Bride',
              rating: 5,
              date: '1 week ago',
              image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100'
            },
            {
              text: 'Best haircut I\'ve ever had! The consultation was thorough and Alex really listened.',
              author: 'Michael Chen',
              location: 'New Client',
              rating: 5,
              date: '2 weeks ago',
              image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
            }
          ],
          stats: {
            averageRating: 4.9,
            totalReviews: 523,
            googleRating: 4.9,
            instagramFollowers: '12.5K'
          }
        },
        
        stats: {
          items: [
            { number: '4.9', label: 'Star Rating' },
            { number: '6+', label: 'Years Excellence' },
            { number: '12.5K', label: 'Instagram Fans' },
            { number: 'Award', label: 'Winning' }
          ]
        },
        
        credentials: {
          title: 'Awards & Recognition',
          items: [
            { icon: '🏆', name: 'Best Salon 2023', description: 'Local Magazine' },
            { icon: '⭐', name: 'Top Rated', description: 'Google & Yelp' },
            { icon: '💎', name: 'Premium Products', description: 'Redken & Olaplex' },
            { icon: '📰', name: 'Featured In', description: 'Beauty Publications' }
          ]
        },
        
        faq: {
          title: 'Frequently Asked Questions',
          items: [
            { question: 'Do I need an appointment?', answer: 'Yes, we operate by appointment only. Walk-ins welcome if stylists are available.' },
            { question: 'What products do you use?', answer: 'We use premium professional lines including Redken, Olaplex, Kevin Murphy, and R+Co.' },
            { question: 'How often should I get my color touched up?', answer: 'Root touch-ups every 4-6 weeks, balayage can last 3-4 months.' },
            { question: 'Do you offer consultations?', answer: 'Yes! Free consultations are included with every appointment.' },
            { question: 'What\'s your cancellation policy?', answer: 'We require 24-hour notice. Late cancellations may incur a 50% fee.' },
            { question: 'Can you match my hair to a photo?', answer: 'We love inspiration photos! Bring them to your consultation.' },
            { question: 'Do you do men\'s haircuts?', answer: 'Absolutely! Our stylists are experienced with all types of cuts.' },
            { question: 'How long does a balayage take?', answer: 'Typically 3-4 hours depending on hair length and desired result.' }
          ]
        },
        
        services: [
          {
            id: '1',
            name: 'Hair Styling',
            title: 'Hair Styling',
            description: 'Expert cuts and styling for all hair types',
            price: 'From $55',
            image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800'
          },
          {
            id: '2',
            name: 'Color Services',
            title: 'Color Services',
            description: 'Custom color treatments by certified colorists',
            price: 'From $125',
            image: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=800'
          },
          {
            id: '3',
            name: 'Extensions',
            title: 'Extensions & Enhancements',
            description: 'Premium hair extensions',
            price: 'From $650',
            image: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800'
          },
          {
            id: '4',
            name: 'Bridal',
            title: 'Bridal Services',
            description: 'Complete bridal beauty packages',
            price: 'From $125',
            image: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800'
          }
        ],
        
        products: [
          {
            id: 'p1',
            name: 'Premium Shampoo & Conditioner Set',
            description: 'Professional-grade sulfate-free formula for all hair types',
            price: 4500,
            image: 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=600',
            category: 'Hair Care'
          },
          {
            id: 'p2',
            name: 'Organic Face Serum',
            description: 'Anti-aging serum with vitamin C and hyaluronic acid',
            price: 6800,
            image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
            category: 'Skin Care'
          },
          {
            id: 'p3',
            name: 'Gift Card - $100',
            description: 'Perfect gift for any occasion',
            price: 10000,
            image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600',
            category: 'Gift Cards'
          },
          {
            id: 'p4',
            name: 'Styling Tool Set',
            description: 'Professional blow dryer and flat iron bundle',
            price: 18900,
            image: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600',
            category: 'Tools'
          }
        ],
        
        contact: {
          title: 'Visit Our Studio',
          subtitle: 'Book your appointment today',
          email: 'hello@luxebeautystudio.com',
          phone: '(555) 234-5678',
          address: '789 Fashion Boulevard, Suite 200, Beverly Hills, CA 90210',
          hours: 'Mon: Closed | Tue-Fri: 9am-8pm | Sat: 8am-6pm | Sun: 10am-5pm',
          parking: 'Complimentary valet parking • Underground garage',
          accessibility: 'Fully wheelchair accessible'
        },
        
        social: {
          facebook: 'https://facebook.com/luxebeautystudio',
          instagram: 'https://instagram.com/luxebeautystudio',
          pinterest: 'https://pinterest.com/luxebeautystudio',
          maps: 'https://maps.google.com/?q=Luxe+Beauty+Studio'
        },
        
        colors: {
          primary: '#A855F7',
          accent: '#9333EA',
          background: '#ffffff'
        },
        
        features: {
          bookingWidget: {
            enabled: true,
            provider: 'calendly',
            url: 'https://calendly.com/luxebeautystudio'
          },
          tabbedServices: true,
          ownerDashboard: true,
          analytics: true,
          gallery: {
            filterable: true,
            categories: ['Hair', 'Color', 'Bridal', 'Extensions']
          },
          teamProfiles: {
            enabled: true,
            bookable: true
          }
        },
        
        settings: {
          allowCheckout: false,
          allowOrders: false,
          bookingEnabled: true,
          bookingWidget: 'calendly',
          tier: 'Pro'
        }
      }
    },

    // More templates follow the same pattern...
    // Each has starter (basic), pro (enhanced), premium (multi-page)
  };

  // Get the demo content for this template and tier
  const templateContent = demoContent[baseTemplate];
  if (!templateContent) {
    return {
      template: templateId,
      templateId: templateId,
      id: templateId,
      businessName: 'Demo Business',
      services: [],
      products: []
    };
  }
  
  const content = templateContent[tier] || templateContent.pro || templateContent.starter;
  
  return {
    ...content,
    template: templateId,
    templateId: templateId,
    id: templateId,
    tier: tier,
  };
};

export default generateDemoContent;
