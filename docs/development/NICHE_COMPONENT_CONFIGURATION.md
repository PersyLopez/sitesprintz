# Niche Component Configuration Guide

This guide shows how to configure the new niche gap components in your template JSON files.

## Table of Contents

1. [Gym Template - Class Scheduler](#gym-template---class-scheduler)
2. [Home Services - Interactive Calculator](#home-services---interactive-calculator)
3. [Cleaning - Room-by-Room Calculator](#cleaning---room-by-room-calculator)
4. [Tech Repair - Diagnostic Quiz](#tech-repair---diagnostic-quiz)
5. [Medical - Multi-Step Form](#medical---multi-step-form)
6. [Legal - Case Evaluation Quiz](#legal---case-evaluation-quiz)
7. [Pet Care - Subscription Booking](#pet-care---subscription-booking)
8. [Salon - Stylist Selection](#salon---stylist-selection)
9. [Restaurant - Dietary Filters](#restaurant---dietary-filters)

---

## Gym Template - Class Scheduler

Add this section to your `gym.json` or `gym-pro.json` template:

```json
{
  "sections": [
    {
      "type": "class-scheduler",
      "id": "class-schedule",
      "settings": {
        "heading": "Class Schedule",
        "subheading": "Book your spot in our group fitness classes",
        "view": "week",
        "classes": [
          {
            "id": "hiit-morning",
            "name": "HIIT Bootcamp",
            "type": "Group Classes",
            "time": "6:00 AM",
            "duration": "45 min",
            "instructor": "Sarah Williams",
            "capacity": 20,
            "booked": 12,
            "daysOfWeek": [1, 3, 5],
            "description": "High-intensity interval training"
          },
          {
            "id": "yoga-evening",
            "name": "Yoga Flow",
            "type": "Mind & Body",
            "time": "7:00 PM",
            "duration": "60 min",
            "instructor": "Sarah Williams",
            "capacity": 15,
            "booked": 8,
            "daysOfWeek": [0, 2, 4],
            "description": "Vinyasa yoga combining movement and breath"
          },
          {
            "id": "crossfit-noon",
            "name": "CrossFit",
            "type": "Group Classes",
            "time": "12:00 PM",
            "duration": "60 min",
            "instructor": "David Chen",
            "capacity": 12,
            "booked": 10,
            "daysOfWeek": [1, 3, 5],
            "description": "Functional fitness combining weightlifting and cardio"
          }
        ],
        "instructors": [
          {
            "id": "sarah-williams",
            "name": "Sarah Williams",
            "title": "Group Fitness Director"
          },
          {
            "id": "david-chen",
            "name": "David Chen",
            "title": "Personal Training Specialist"
          }
        ],
        "onClassSelect": "function(classData) { console.log('Class selected:', classData); }"
      }
    }
  ]
}
```

---

## Home Services - Interactive Calculator

Add this section to `plumbing.json`, `electrician.json`, or `home-services-premium.json`:

```json
{
  "sections": [
    {
      "type": "interactive-calculator",
      "id": "quote-calculator",
      "settings": {
        "heading": "Get an Instant Quote",
        "subheading": "Select your services to see estimated pricing",
        "type": "service-quote",
        "basePrice": 50,
        "items": [
          {
            "id": "diagnostic",
            "name": "Service Call / Diagnostic",
            "price": 75,
            "description": "Professional inspection and diagnosis"
          },
          {
            "id": "repair-basic",
            "name": "Basic Repair",
            "price": 150,
            "description": "Standard repair work (1-2 hours)"
          },
          {
            "id": "repair-complex",
            "name": "Complex Repair",
            "price": 350,
            "description": "Advanced repair work (3-4 hours)"
          },
          {
            "id": "installation",
            "name": "Installation",
            "price": 500,
            "description": "New equipment installation"
          },
          {
            "id": "emergency",
            "name": "Emergency Service",
            "price": 200,
            "description": "After-hours emergency call (added to base)"
          }
        ],
        "discount": {
          "type": "percentage",
          "value": 10,
          "description": "10% off for first-time customers"
        },
        "submitButtonText": "Request Quote",
        "onSubmit": "function(data) { console.log('Quote requested:', data); }"
      }
    }
  ]
}
```

---

## Cleaning - Room-by-Room Calculator

Add this section to `cleaning.json` or `cleaning-pro.json`:

```json
{
  "sections": [
    {
      "type": "interactive-calculator",
      "id": "cleaning-calculator",
      "settings": {
        "heading": "Calculate Your Cleaning Cost",
        "subheading": "Select rooms and services to see your price",
        "type": "room-by-room",
        "basePrice": 0,
        "items": [
          {
            "id": "bedroom",
            "name": "Bedroom",
            "price": 25,
            "description": "Standard bedroom cleaning"
          },
          {
            "id": "bathroom",
            "name": "Bathroom",
            "price": 35,
            "description": "Deep bathroom cleaning"
          },
          {
            "id": "kitchen",
            "name": "Kitchen",
            "price": 40,
            "description": "Kitchen deep clean"
          },
          {
            "id": "living-room",
            "name": "Living Room",
            "price": 30,
            "description": "Living area cleaning"
          },
          {
            "id": "office",
            "name": "Home Office",
            "price": 20,
            "description": "Office space cleaning"
          }
        ],
        "discount": {
          "type": "fixed",
          "value": 20,
          "description": "$20 off first cleaning"
        },
        "submitButtonText": "Book Cleaning",
        "onSubmit": "function(data) { console.log('Cleaning booked:', data); }"
      }
    }
  ]
}
```

---

## Tech Repair - Diagnostic Quiz

Add this section to `tech-repair.json` or `tech-repair-pro.json`:

```json
{
  "sections": [
    {
      "type": "diagnostic-quiz",
      "id": "device-diagnostic",
      "settings": {
        "heading": "Device Diagnostic Tool",
        "subheading": "Answer a few questions to get an instant repair estimate",
        "questions": [
          {
            "id": "device-type",
            "title": "What device needs repair?",
            "description": "Select the type of device",
            "type": "radio",
            "required": true,
            "options": [
              {
                "value": "iphone",
                "label": "iPhone",
                "price": 0
              },
              {
                "value": "android",
                "label": "Android Phone",
                "price": 0
              },
              {
                "value": "laptop",
                "label": "Laptop",
                "price": 0
              },
              {
                "value": "tablet",
                "label": "Tablet",
                "price": 0
              }
            ]
          },
          {
            "id": "issue-type",
            "title": "What's the problem?",
            "description": "Select the main issue",
            "type": "radio",
            "required": true,
            "conditional": {
              "field": "device-type",
              "operator": "equals",
              "value": "iphone"
            },
            "options": [
              {
                "value": "screen",
                "label": "Cracked/Broken Screen",
                "price": 150
              },
              {
                "value": "battery",
                "label": "Battery Replacement",
                "price": 80
              },
              {
                "value": "charging",
                "label": "Charging Port Issue",
                "price": 100
              },
              {
                "value": "water",
                "label": "Water Damage",
                "price": 200
              }
            ]
          },
          {
            "id": "urgency",
            "title": "How urgent is this repair?",
            "description": "Select your timeline",
            "type": "radio",
            "required": true,
            "options": [
              {
                "value": "standard",
                "label": "Standard (3-5 days)",
                "price": 0
              },
              {
                "value": "rush",
                "label": "Rush (24-48 hours)",
                "price": 50
              },
              {
                "value": "same-day",
                "label": "Same Day",
                "price": 100
              }
            ]
          }
        ],
        "recommendations": {
          "screen:rush": {
            "title": "Screen Repair - Rush Service",
            "description": "We can replace your screen within 24-48 hours. Includes warranty on parts and labor."
          },
          "battery:standard": {
            "title": "Battery Replacement",
            "description": "Standard battery replacement takes 3-5 days. We'll test your device thoroughly before returning it."
          }
        },
        "pricing": {
          "base": 0,
          "rules": [
            {
              "conditions": [
                {
                  "field": "device-type",
                  "operator": "equals",
                  "value": "iphone"
                },
                {
                  "field": "issue-type",
                  "operator": "equals",
                  "value": "screen"
                }
              ],
              "price": 150
            }
          ]
        },
        "resultsTitle": "Your Repair Estimate",
        "submitButtonText": "Schedule Repair",
        "onSubmit": "function(results) { console.log('Diagnostic results:', results); }"
      }
    }
  ]
}
```

---

## Medical - Multi-Step Form

Add this section to `medical-premium.json`:

```json
{
  "sections": [
    {
      "type": "multi-step-form",
      "id": "patient-intake",
      "settings": {
        "heading": "New Patient Intake Form",
        "subheading": "Please complete this form before your first visit",
        "steps": [
          {
            "title": "Personal Information",
            "description": "Let's start with your basic information",
            "fields": [
              {
                "name": "firstName",
                "label": "First Name",
                "type": "text",
                "required": true,
                "placeholder": "John"
              },
              {
                "name": "lastName",
                "label": "Last Name",
                "type": "text",
                "required": true,
                "placeholder": "Doe"
              },
              {
                "name": "dateOfBirth",
                "label": "Date of Birth",
                "type": "text",
                "required": true,
                "placeholder": "MM/DD/YYYY"
              },
              {
                "name": "phone",
                "label": "Phone Number",
                "type": "tel",
                "required": true,
                "placeholder": "(555) 123-4567"
              },
              {
                "name": "email",
                "label": "Email Address",
                "type": "email",
                "required": true,
                "placeholder": "john@example.com"
              }
            ]
          },
          {
            "title": "Insurance Information",
            "description": "Help us verify your insurance coverage",
            "fields": [
              {
                "name": "insuranceProvider",
                "label": "Insurance Provider",
                "type": "select",
                "required": true,
                "options": [
                  { "value": "blue-cross", "label": "Blue Cross Blue Shield" },
                  { "value": "aetna", "label": "Aetna" },
                  { "value": "cigna", "label": "Cigna" },
                  { "value": "united", "label": "UnitedHealthcare" },
                  { "value": "other", "label": "Other" }
                ]
              },
              {
                "name": "policyNumber",
                "label": "Policy Number",
                "type": "text",
                "required": true,
                "placeholder": "Enter your policy number"
              },
              {
                "name": "groupNumber",
                "label": "Group Number (if applicable)",
                "type": "text",
                "required": false,
                "placeholder": "Optional"
              }
            ]
          },
          {
            "title": "Medical History",
            "description": "Tell us about your medical history",
            "fields": [
              {
                "name": "currentMedications",
                "label": "Current Medications",
                "type": "textarea",
                "required": false,
                "placeholder": "List any medications you're currently taking",
                "rows": 4
              },
              {
                "name": "allergies",
                "label": "Allergies",
                "type": "textarea",
                "required": false,
                "placeholder": "List any known allergies",
                "rows": 3
              },
              {
                "name": "previousConditions",
                "label": "Previous Medical Conditions",
                "type": "checkbox",
                "required": false,
                "options": [
                  { "value": "diabetes", "label": "Diabetes" },
                  { "value": "hypertension", "label": "Hypertension" },
                  { "value": "heart-disease", "label": "Heart Disease" },
                  { "value": "none", "label": "None" }
                ]
              }
            ]
          },
          {
            "title": "Reason for Visit",
            "description": "What brings you in today?",
            "fields": [
              {
                "name": "chiefComplaint",
                "label": "Primary Concern",
                "type": "textarea",
                "required": true,
                "placeholder": "Describe your symptoms or reason for visit",
                "rows": 5
              },
              {
                "name": "symptoms",
                "label": "Symptoms",
                "type": "checkbox",
                "required": false,
                "options": [
                  { "value": "pain", "label": "Pain" },
                  { "value": "fever", "label": "Fever" },
                  { "value": "nausea", "label": "Nausea" },
                  { "value": "fatigue", "label": "Fatigue" },
                  { "value": "other", "label": "Other" }
                ]
              }
            ]
          }
        ],
        "submitButtonText": "Submit Intake Form",
        "onSubmit": "function(data) { console.log('Patient intake submitted:', data); }"
      }
    }
  ]
}
```

---

## Legal - Case Evaluation Quiz

Add this section to `legal-premium.json`:

```json
{
  "sections": [
    {
      "type": "diagnostic-quiz",
      "id": "case-evaluation",
      "settings": {
        "heading": "Free Case Evaluation",
        "subheading": "Answer a few questions to see if you have a case",
        "questions": [
          {
            "id": "case-type",
            "title": "What type of legal issue are you facing?",
            "type": "radio",
            "required": true,
            "options": [
              { "value": "personal-injury", "label": "Personal Injury" },
              { "value": "family-law", "label": "Family Law" },
              { "value": "criminal", "label": "Criminal Defense" },
              { "value": "business", "label": "Business Law" },
              { "value": "estate", "label": "Estate Planning" }
            ]
          },
          {
            "id": "timeline",
            "title": "When did this issue occur?",
            "type": "radio",
            "required": true,
            "options": [
              { "value": "within-week", "label": "Within the last week" },
              { "value": "within-month", "label": "Within the last month" },
              { "value": "within-year", "label": "Within the last year" },
              { "value": "over-year", "label": "Over a year ago" }
            ]
          },
          {
            "id": "severity",
            "title": "How would you describe the severity?",
            "type": "radio",
            "required": true,
            "options": [
              { "value": "critical", "label": "Critical - Immediate action needed" },
              { "value": "serious", "label": "Serious - Needs attention soon" },
              { "value": "moderate", "label": "Moderate - Can wait a bit" },
              { "value": "minor", "label": "Minor - Just want advice" }
            ]
          }
        ],
        "recommendations": {
          "personal-injury:critical": {
            "title": "Personal Injury Case - Urgent",
            "description": "Based on your answers, you may have a strong personal injury case. We recommend scheduling a consultation immediately to preserve evidence and meet statute of limitations."
          },
          "family-law:serious": {
            "title": "Family Law Matter",
            "description": "Family law matters require careful handling. We can help you understand your rights and options during a consultation."
          }
        },
        "resultsTitle": "Your Case Evaluation",
        "submitButtonText": "Schedule Free Consultation",
        "onSubmit": "function(results) { console.log('Case evaluation:', results); }"
      }
    }
  ]
}
```

---

## Pet Care - Subscription Booking

Add this section to `pet-care.json` or `pet-care-pro.json`:

```json
{
  "sections": [
    {
      "type": "subscription-booking",
      "id": "recurring-services",
      "settings": {
        "title": "Book Recurring Pet Care",
        "description": "Set up automatic weekly, bi-weekly, or monthly service",
        "services": [
          {
            "id": "grooming",
            "name": "Full Grooming",
            "price": 75,
            "description": "Complete grooming service including bath, haircut, and nail trim"
          },
          {
            "id": "walking",
            "name": "Dog Walking",
            "price": 25,
            "description": "30-minute professional dog walking service"
          },
          {
            "id": "daycare",
            "name": "Pet Daycare",
            "price": 40,
            "description": "Full day of supervised play and care"
          }
        ],
        "frequencies": [
          {
            "value": "weekly",
            "label": "Weekly",
            "discount": 10
          },
          {
            "value": "bi-weekly",
            "label": "Bi-Weekly",
            "discount": 5
          },
          {
            "value": "monthly",
            "label": "Monthly",
            "discount": 15
          }
        ],
        "submitButtonText": "Book Recurring Service",
        "onSubmit": "function(data) { console.log('Subscription booking:', data); }"
      }
    }
  ]
}
```

---

## Salon - Stylist Selection

Add this section to `salon.json` or `salon-pro.json`:

```json
{
  "sections": [
    {
      "type": "class-scheduler",
      "id": "stylist-booking",
      "settings": {
        "heading": "Book with Your Stylist",
        "subheading": "Select your preferred stylist and appointment time",
        "view": "week",
        "classes": [
          {
            "id": "cut-color-maria",
            "name": "Cut & Color",
            "type": "Hair Services",
            "time": "10:00 AM",
            "duration": "2 hours",
            "instructor": "Maria Rodriguez",
            "capacity": 1,
            "booked": 0,
            "daysOfWeek": [1, 2, 3, 4, 5],
            "description": "Full cut and color service"
          },
          {
            "id": "highlights-sarah",
            "name": "Highlights",
            "type": "Hair Services",
            "time": "2:00 PM",
            "duration": "3 hours",
            "instructor": "Sarah Johnson",
            "capacity": 1,
            "booked": 0,
            "daysOfWeek": [1, 3, 5],
            "description": "Full highlight service"
          }
        ],
        "instructors": [
          {
            "id": "maria-rodriguez",
            "name": "Maria Rodriguez",
            "title": "Senior Stylist"
          },
          {
            "id": "sarah-johnson",
            "name": "Sarah Johnson",
            "title": "Color Specialist"
          }
        ]
      }
    }
  ]
}
```

---

## Restaurant - Dietary Filters

Add this section to `restaurant.json`:

```json
{
  "sections": [
    {
      "type": "service-filters",
      "id": "menu-filters",
      "settings": {
        "heading": "Filter Menu",
        "subheading": "Find dishes that match your dietary preferences",
        "items": [
          {
            "id": "grilled-salmon",
            "name": "Grilled Salmon",
            "category": "Main Course",
            "price": 28,
            "dietary": ["gluten-free", "pescatarian"],
            "description": "Fresh Atlantic salmon with seasonal vegetables"
          },
          {
            "id": "vegan-bowl",
            "name": "Vegan Power Bowl",
            "category": "Main Course",
            "price": 18,
            "dietary": ["vegan", "gluten-free"],
            "description": "Quinoa, roasted vegetables, and tahini dressing"
          },
          {
            "id": "chicken-parm",
            "name": "Chicken Parmesan",
            "category": "Main Course",
            "price": 24,
            "dietary": [],
            "description": "Breaded chicken with marinara and mozzarella"
          }
        ],
        "filters": ["category", "dietary"],
        "filterConfig": {
          "dietary": {
            "label": "Dietary Restrictions",
            "options": [
              { "value": "vegan", "label": "Vegan" },
              { "value": "vegetarian", "label": "Vegetarian" },
              { "value": "gluten-free", "label": "Gluten-Free" },
              { "value": "pescatarian", "label": "Pescatarian" },
              { "value": "keto", "label": "Keto" }
            ]
          }
        },
        "onFilterChange": "function(filteredItems, activeFilters) { console.log('Filtered items:', filteredItems); }"
      }
    }
  ]
}
```

---

## Additional Components

### Progress Tracker (Tech Repair, Home Services)

```json
{
  "type": "progress-tracker",
  "id": "order-tracking",
  "settings": {
    "title": "Track Your Repair",
    "orderId": "REP-12345",
    "statuses": [
      { "id": "pending", "label": "Pending", "description": "Your request has been received" },
      { "id": "confirmed", "label": "Confirmed", "description": "We've confirmed your repair" },
      { "id": "in-progress", "label": "In Progress", "description": "Repair work has begun" },
      { "id": "completed", "label": "Completed", "description": "Repair complete and ready for pickup" }
    ],
    "currentStatus": "in-progress",
    "updates": [
      {
        "status": "pending",
        "timestamp": "2024-01-15T10:00:00Z",
        "message": "Repair request received"
      },
      {
        "status": "confirmed",
        "timestamp": "2024-01-15T11:30:00Z",
        "message": "Diagnostic completed - screen replacement needed"
      },
      {
        "status": "in-progress",
        "timestamp": "2024-01-15T14:00:00Z",
        "message": "Repair in progress - estimated completion: 2 hours"
      }
    ],
    "technicianETA": "2024-01-15T16:00:00Z"
  }
}
```

### Resource Center (Legal, Medical)

```json
{
  "type": "resource-center",
  "id": "legal-resources",
  "settings": {
    "title": "Legal Resources",
    "description": "Download free guides and resources",
    "resources": [
      {
        "id": "divorce-guide",
        "title": "Divorce Process Guide",
        "description": "Complete guide to the divorce process in your state",
        "category": "Family Law",
        "type": "pdf",
        "size": "2.5 MB",
        "url": "/resources/divorce-guide.pdf"
      },
      {
        "id": "will-checklist",
        "title": "Estate Planning Checklist",
        "description": "Checklist for creating your will and estate plan",
        "category": "Estate Planning",
        "type": "pdf",
        "size": "1.2 MB",
        "url": "/resources/estate-checklist.pdf"
      }
    ],
    "requireEmail": true,
    "onDownload": "function(resource, email) { console.log('Resource downloaded:', resource, email); }"
  }
}
```

### Video Gallery (Gym)

```json
{
  "type": "video-gallery",
  "id": "workout-library",
  "settings": {
    "title": "On-Demand Workout Library",
    "description": "Access workout videos anytime, anywhere",
    "videos": [
      {
        "id": "hiit-workout-1",
        "title": "20-Minute HIIT Workout",
        "description": "High-intensity interval training for all fitness levels",
        "category": "HIIT",
        "provider": "youtube",
        "videoId": "dQw4w9WgXcQ",
        "duration": "20 min",
        "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      },
      {
        "id": "yoga-flow",
        "title": "Morning Yoga Flow",
        "description": "Gentle yoga sequence to start your day",
        "category": "Yoga",
        "provider": "vimeo",
        "videoId": "123456789",
        "duration": "30 min"
      }
    ],
    "categories": ["HIIT", "Yoga", "Strength", "Cardio"],
    "showCategories": true
  }
}
```

### ZIP Checker (Home Services, Cleaning)

```json
{
  "type": "zip-checker",
  "id": "service-area",
  "settings": {
    "title": "Check Service Availability",
    "description": "Enter your ZIP code to see if we service your area",
    "serviceAreas": ["75001", "75002", "75003"],
    "serviceAreaRanges": [
      { "start": 75000, "end": 75999 }
    ],
    "successMessage": "Great news! We service your area.",
    "errorMessage": "We don't currently service this area, but we're expanding!",
    "showLeadCapture": true,
    "onValidZip": "function(zip) { console.log('Valid ZIP:', zip); }",
    "onOutOfArea": "function(zip, leadData) { console.log('Out of area lead:', zip, leadData); }"
  }
}
```

### Enhanced Profiles (Medical, Legal, Salon)

```json
{
  "type": "enhanced-profiles",
  "id": "provider-profiles",
  "settings": {
    "title": "Our Team",
    "description": "Meet our experienced professionals",
    "layout": "grid",
    "profiles": [
      {
        "id": "dr-smith",
        "name": "Dr. Sarah Smith",
        "title": "Primary Care Physician",
        "bio": "Board-certified family medicine physician with 15 years of experience.",
        "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
        "credentials": ["MD", "Board Certified Family Medicine", "ACLS Certified"],
        "specializations": ["Preventive Care", "Chronic Disease Management", "Women's Health"],
        "email": "sarah.smith@clinic.com",
        "phone": "(555) 123-4567",
        "social": {
          "linkedin": "https://linkedin.com/in/sarahsmith",
          "website": "https://sarahsmithmd.com"
        }
      }
    ],
    "showCredentials": true,
    "showSpecializations": true,
    "showSocialLinks": true
  }
}
```

---

## Integration Notes

1. **Component Loading**: All components are automatically loaded when their section type is detected in the template.

2. **Feature Gating**: Components respect the plan tier system. Make sure to check `hasFeature()` in your templates if needed.

3. **Styling**: Components use CSS variables from your theme configuration, so they'll automatically match your site's design.

4. **Callbacks**: The `onSubmit`, `onChange`, etc. callbacks can be JavaScript function strings that will be evaluated, or you can handle them server-side.

5. **Data Persistence**: Multi-step forms and diagnostic quizzes can persist data to localStorage automatically.

---

## Next Steps

1. Add these sections to your template JSON files
2. Test each component in your development environment
3. Customize the styling and content to match your brand
4. Integrate with your backend APIs for form submissions and data handling

For more details on each component's API, see the component files in `/public/modules/`.

