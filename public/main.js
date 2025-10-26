'use strict';

(function () {
  const SELECTORS = {
    serviceOptions: '.service-option',
    serviceSelection: '#serviceSelection',
    contactSection: '#contactInfoSection',
    progressSteps: '.progress-step',
    progressLines: '.progress-line',
    backButton: '#backToServices',
    continueButton: '#proceedToSchedule',
    contactForm: '#contactForm'
  };

  const STORAGE_KEYS = {
    selectedService: 'fg_selected_service',
    contact: 'fg_contact',
    location: 'fg_location'
  };

  /** State */
  let selectedService = null;
  let currentLocation = null;
  let locationPermission = null;

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }
  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  // Geolocation Functions
  function getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: Date.now()
          };
          
          // Validate location accuracy
          if (location.accuracy > 100) {
            console.warn(`Location accuracy is ${location.accuracy}m - may not be precise enough`);
          }
          
          currentLocation = location;
          sessionStorage.setItem(STORAGE_KEYS.location, JSON.stringify(location));
          
          console.log(`📍 GPS Location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (accuracy: ${location.accuracy}m)`);
          resolve(location);
        },
        (error) => {
          locationPermission = 'denied';
          handleLocationError(error);
          reject(error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, // Increased timeout for better accuracy
          maximumAge: 60000 // 1 minute (fresher data)
        }
      );
    });
  }

  async function reverseGeocode(lat, lng) {
    try {
      // Try multiple geocoding services for maximum accuracy
      const geocodingServices = [
        // 1. OpenStreetMap Nominatim (best for street-level data)
        {
          name: 'OpenStreetMap',
          url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&extratags=1`,
          headers: { 'User-Agent': 'Fix&Go-Mobile-Service/1.0' }
        },
        // 2. BigDataCloud (good for US addresses)
        {
          name: 'BigDataCloud',
          url: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          headers: {}
        },
        // 3. Google Geocoding (if available - requires API key)
        // 4. MapBox (if available - requires API key)
      ];

      for (const service of geocodingServices) {
        try {
          console.log(`Trying ${service.name} geocoding...`);
          const response = await fetch(service.url, { headers: service.headers });
          const data = await response.json();
          
          if (service.name === 'OpenStreetMap' && data && data.display_name) {
            const address = data.address || {};
            const streetNumber = address.house_number || '';
            const streetName = address.road || address.street || '';
            const city = address.city || address.town || address.village || address.hamlet || '';
            const state = address.state || address.region || '';
            const postalCode = address.postcode || '';
            
            // Check if we have good street-level data
            if (streetNumber && streetName) {
              let fullAddress = `${streetNumber} ${streetName}`;
              if (city && city !== fullAddress) {
                fullAddress += `, ${city}`;
              }
              if (state) {
                fullAddress += `, ${state}`;
              }
              if (postalCode) {
                fullAddress += ` ${postalCode}`;
              }
              
              console.log(`✅ ${service.name} found precise address: ${fullAddress}`);
              return {
                address: streetName,
                city: city || 'Unknown',
                state: state || 'Unknown',
                country: address.country || 'Unknown',
                postalCode: postalCode || '',
                fullAddress: fullAddress,
                confidence: 'high',
                coordinates: { lat: parseFloat(lat.toFixed(8)), lng: parseFloat(lng.toFixed(8)) }
              };
            }
          }
          
          if (service.name === 'BigDataCloud' && data && data.city) {
            const streetNumber = data.streetNumber || '';
            const streetName = data.streetName || data.localityInfo?.administrative?.[0]?.name || '';
            const city = data.city || data.localityInfo?.administrative?.[1]?.name || '';
            const state = data.principalSubdivision || data.localityInfo?.administrative?.[2]?.name || '';
            const postalCode = data.postcode || '';
            
            // Clean up street name
            const cleanStreetName = streetName.replace(/^United States of America \(the\),?\s*/i, '').trim();
            
            if (cleanStreetName && city) {
              let fullAddress = '';
              if (streetNumber && cleanStreetName) {
                fullAddress = `${streetNumber} ${cleanStreetName}`;
              } else if (cleanStreetName) {
                fullAddress = cleanStreetName;
              } else {
                fullAddress = city;
              }
              
              if (city && city !== fullAddress) {
                fullAddress += `, ${city}`;
              }
              if (state) {
                fullAddress += `, ${state}`;
              }
              if (postalCode) {
                fullAddress += ` ${postalCode}`;
              }
              
              console.log(`✅ ${service.name} found address: ${fullAddress}`);
              return {
                address: cleanStreetName || city || 'Unknown',
                city: city || 'Unknown',
                state: state || 'Unknown',
                country: data.countryName || 'Unknown',
                postalCode: postalCode || '',
                fullAddress: fullAddress,
                confidence: 'medium'
              };
            }
          }
        } catch (error) {
          console.log(`❌ ${service.name} failed: ${error.message}`);
        }
      }

      // Fallback to BigDataCloud
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        const data = await response.json();
        
        if (data && data.city) {
          // Build precise address from BigDataCloud
          const streetNumber = data.streetNumber || '';
          const streetName = data.streetName || data.localityInfo?.administrative?.[0]?.name || '';
          const city = data.city || data.localityInfo?.administrative?.[1]?.name || '';
          const state = data.principalSubdivision || data.localityInfo?.administrative?.[2]?.name || '';
          const postalCode = data.postcode || '';
          
          // Clean up street name (remove country prefix if present)
          const cleanStreetName = streetName.replace(/^United States of America \(the\),?\s*/i, '').trim();
          
          let fullAddress = '';
          if (streetNumber && cleanStreetName) {
            fullAddress = `${streetNumber} ${cleanStreetName}`;
          } else if (cleanStreetName) {
            fullAddress = cleanStreetName;
          } else {
            fullAddress = city;
          }
          
          if (city && city !== fullAddress) {
            fullAddress += `, ${city}`;
          }
          if (state) {
            fullAddress += `, ${state}`;
          }
          if (postalCode) {
            fullAddress += ` ${postalCode}`;
          }
          
          return {
            address: cleanStreetName || city || 'Unknown',
            city: city || 'Unknown',
            state: state || 'Unknown',
            country: data.countryName || 'Unknown',
            postalCode: postalCode || '',
            fullAddress: fullAddress || 'Location not available'
          };
        }
      } catch (error) {
        console.log('BigDataCloud failed, using coordinates...');
      }

      // Final fallback: Use coordinates
      return {
        address: 'GPS Location',
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        postalCode: '',
        fullAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      };

    } catch (error) {
      console.error('All reverse geocoding failed:', error);
      return {
        address: 'Unknown Location',
        city: 'Unknown',
        state: 'Unknown',
        country: 'Unknown',
        postalCode: '',
        fullAddress: 'Location not available'
      };
    }
  }

  async function geocodeAddress(address) {
    try {
      // Try BigDataCloud first for better results
      const response = await fetch(`https://api.bigdatacloud.net/data/forward-geocode-client?query=${encodeURIComponent(address)}&localityLanguage=en&limit=5`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Return the best result with highest confidence
        const bestResult = data.results.reduce((best, current) => 
          (current.confidence || 0) > (best.confidence || 0) ? current : best
        );
        
        // Build precise address
        const streetNumber = bestResult.streetNumber || '';
        const streetName = bestResult.streetName || '';
        const city = bestResult.city || '';
        const state = bestResult.principalSubdivision || '';
        const postalCode = bestResult.postcode || '';
        
        let formattedAddress = '';
        if (streetNumber && streetName) {
          formattedAddress = `${streetNumber} ${streetName}`;
        } else if (streetName) {
          formattedAddress = streetName;
        } else {
          formattedAddress = bestResult.formattedAddress || address;
        }
        
        if (city && city !== formattedAddress) {
          formattedAddress += `, ${city}`;
        }
        if (state) {
          formattedAddress += `, ${state}`;
        }
        if (postalCode) {
          formattedAddress += ` ${postalCode}`;
        }
        
        return {
          lat: bestResult.latitude,
          lng: bestResult.longitude,
          address: formattedAddress,
          confidence: bestResult.confidence || 0,
          streetNumber: streetNumber,
          streetName: streetName,
          city: city,
          state: state,
          postalCode: postalCode
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  function setupAddressAutocomplete() {
    const locationField = qs('#serviceLocation');
    if (!locationField) return;

    let autocompleteTimeout;
    let autocompleteResults = [];
    let selectedIndex = -1;

    // Create autocomplete dropdown
    const autocompleteDropdown = document.createElement('div');
    autocompleteDropdown.className = 'autocomplete-dropdown';
    autocompleteDropdown.style.display = 'none';
    locationField.parentNode.appendChild(autocompleteDropdown);

    function showAutocomplete() {
      if (autocompleteResults.length > 0) {
        autocompleteDropdown.style.display = 'block';
        autocompleteDropdown.innerHTML = autocompleteResults.map((result, index) => 
          `<div class="autocomplete-item ${index === selectedIndex ? 'selected' : ''}" data-index="${index}">
            <div class="autocomplete-address">${result.address}</div>
            <div class="autocomplete-confidence">${Math.round(result.confidence * 100)}% match</div>
          </div>`
        ).join('');
      } else {
        autocompleteDropdown.style.display = 'none';
      }
    }

    function hideAutocomplete() {
      autocompleteDropdown.style.display = 'none';
      selectedIndex = -1;
    }

    function selectResult(index) {
      if (index >= 0 && index < autocompleteResults.length) {
        const result = autocompleteResults[index];
        locationField.value = result.address;
        
        // Update map
        if (map) {
          map.setView([result.lat, result.lng], 15);
          if (mapMarker) {
            map.removeLayer(mapMarker);
          }
          mapMarker = L.marker([result.lat, result.lng]).addTo(map);
        }
        
        // Update location data
        currentLocation = { lat: result.lat, lng: result.lng, timestamp: Date.now() };
        sessionStorage.setItem(STORAGE_KEYS.location, JSON.stringify(currentLocation));
        
        hideAutocomplete();
      }
    }

    // Handle input
    locationField.addEventListener('input', () => {
      const query = locationField.value.trim();
      
      if (query.length < 3) {
        hideAutocomplete();
        return;
      }

      clearTimeout(autocompleteTimeout);
      autocompleteTimeout = setTimeout(async () => {
        const result = await geocodeAddress(query);
        if (result) {
          autocompleteResults = [result];
          selectedIndex = 0;
          showAutocomplete();
        } else {
          hideAutocomplete();
        }
      }, 300);
    });

    // Handle keyboard navigation
    locationField.addEventListener('keydown', (e) => {
      if (autocompleteDropdown.style.display === 'none') return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, autocompleteResults.length - 1);
          showAutocomplete();
          break;
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          showAutocomplete();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            selectResult(selectedIndex);
          }
          break;
        case 'Escape':
          hideAutocomplete();
          break;
      }
    });

    // Handle clicks on autocomplete items
    autocompleteDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (item) {
        const index = parseInt(item.dataset.index);
        selectResult(index);
      }
    });

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!locationField.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        hideAutocomplete();
      }
    });
  }

  function showLocationPermissionRequest() {
    const locationField = qs('#serviceLocation');
    if (!locationField) return;

    // Create location permission UI
    const permissionDiv = document.createElement('div');
    permissionDiv.className = 'location-permission';
    permissionDiv.innerHTML = `
      <div class="location-permission-content">
        <div class="location-icon">📍</div>
        <div class="location-text">
          <h4>Allow Location Access</h4>
          <p>We can automatically detect your current location to make service requests faster and more accurate.</p>
          <div class="location-buttons">
            <button type="button" class="btn btn-primary" id="allowLocation">Use My Location</button>
            <button type="button" class="btn btn-secondary" id="manualLocation">Enter Manually</button>
          </div>
        </div>
      </div>
    `;

    locationField.parentNode.insertBefore(permissionDiv, locationField);
    hide(locationField);

    // Add event listeners
    qs('#allowLocation').addEventListener('click', async () => {
      try {
        const location = await getCurrentLocation();
        const address = await reverseGeocode(location.lat, location.lng);
        locationField.value = address.fullAddress;
        permissionDiv.remove();
        show(locationField);
        // Location detected successfully - no need to show success message here
      } catch (error) {
        console.error('Location access failed:', error);
        showErrorMessage('Could not access your location. Please enter your address manually.');
        permissionDiv.remove();
        show(locationField);
      }
    });

    qs('#manualLocation').addEventListener('click', () => {
      permissionDiv.remove();
      show(locationField);
    });
  }

  function setupLocationControls() {
    const useCurrentBtn = qs('#useCurrentLocation');
    
    if (useCurrentBtn) {
      useCurrentBtn.addEventListener('click', async () => {
        const originalText = useCurrentBtn.textContent;
        const locationField = qs('#serviceLocation');
        
        try {
          // Show loading state
          useCurrentBtn.textContent = '📍 Detecting Location...';
          useCurrentBtn.disabled = true;
          
          const location = await getCurrentLocation();
          
          // Validate location accuracy
          if (location.accuracy > 50) {
            console.warn(`Location accuracy is ${location.accuracy}m - may not be precise enough for street-level geocoding`);
          }
          
          // Show geocoding state
          useCurrentBtn.textContent = '📍 Getting Address...';
          
          const address = await reverseGeocode(location.lat, location.lng);
          
          if (locationField && address.fullAddress !== 'Location not available') {
            locationField.value = address.fullAddress;
            
            // Show accuracy information
            const accuracyInfo = location.accuracy <= 10 ? ' (very precise)' : 
                                location.accuracy <= 50 ? ' (precise)' : 
                                location.accuracy <= 100 ? ' (good)' : ' (approximate)';
            
            // Location detected successfully - no need to show success message here
          } else {
            showErrorMessage('Could not determine your address. Please enter it manually.');
          }
        } catch (error) {
          console.error('Location detection failed:', error);
          showErrorMessage('Could not access your location. Please enter your address manually.');
        } finally {
          // Reset button state
          useCurrentBtn.textContent = originalText;
          useCurrentBtn.disabled = false;
        }
      });
    }
  }

  function initializeLocationFeatures() {
    // Check if we're on the contact form page
    const locationField = qs('#serviceLocation');
    if (!locationField) return;

    // Setup location controls
    setupLocationControls();

    // Setup address autocomplete only if not already set up
    const existingAutocomplete = qs('.autocomplete-dropdown');
    if (!existingAutocomplete) {
      setupAddressAutocomplete();
    }

    // Check if location permission was previously denied
    const savedLocation = sessionStorage.getItem(STORAGE_KEYS.location);
    if (savedLocation) {
      try {
        currentLocation = JSON.parse(savedLocation);
        // Auto-fill if we have a recent location
        if (currentLocation && Date.now() - currentLocation.timestamp < 300000) { // 5 minutes
          reverseGeocode(currentLocation.lat, currentLocation.lng).then(address => {
            if (address.fullAddress !== 'Location not available') {
              locationField.value = address.fullAddress;
            }
          });
          
          // Center map on saved location
          if (map) {
            map.setView([currentLocation.lat, currentLocation.lng], 15);
            if (mapMarker) {
              map.removeLayer(mapMarker);
            }
            mapMarker = L.marker([currentLocation.lat, currentLocation.lng]).addTo(map);
          }
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }

    // Show location permission request if no location data
    if (!currentLocation && !locationField.value) {
      showLocationPermissionRequest();
    }
  }

  function updateProgress(step) {
    const steps = qsa(SELECTORS.progressSteps);
    const lines = qsa(SELECTORS.progressLines);

    steps.forEach((el, idx) => {
      el.classList.remove('active', 'completed');
      el.removeAttribute('aria-current');
      const number = idx + 1;
      if (number < step) {
        el.classList.add('completed');
      } else if (number === step) {
        el.classList.add('active');
        el.setAttribute('aria-current', 'step');
      }
    });

    lines.forEach((line, idx) => {
      if (idx < step - 1) {
        line.classList.add('completed');
      } else {
        line.classList.remove('completed');
      }
    });
  }

  function selectService(optionEl) {
    qsa(SELECTORS.serviceOptions).forEach((el) => {
      el.classList.remove('selected');
      el.setAttribute('aria-pressed', 'false');
    });
    optionEl.classList.add('selected');
    optionEl.setAttribute('aria-pressed', 'true');
    selectedService = optionEl.getAttribute('data-service');
    sessionStorage.setItem(STORAGE_KEYS.selectedService, selectedService);
    
    // Update the selected service display
    const serviceName = optionEl.querySelector('h4').textContent;
    const serviceDescription = optionEl.querySelector('p').textContent;
    const selectedServiceNameEl = qs('#selectedServiceName');
    const selectedServiceDescriptionEl = qs('#selectedServiceDescription');
    
    if (selectedServiceNameEl) {
      selectedServiceNameEl.textContent = serviceName;
    }
    if (selectedServiceDescriptionEl) {
      selectedServiceDescriptionEl.textContent = serviceDescription;
    }

    // Add haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Smooth transition to contact step
    setTimeout(() => {
      hide(qs(SELECTORS.serviceSelection));
      show(qs(SELECTORS.contactSection));
      updateProgress(2);
      
      // Initialize location features when transitioning to contact form
      initializeLocationFeatures();
      
      // Focus on first input for better accessibility
      const firstInput = qs('#customerName');
      if (firstInput) {
        firstInput.focus();
      }
    }, 300);
  }

  function backToServices() {
    show(qs(SELECTORS.serviceSelection));
    hide(qs(SELECTORS.contactSection));
    updateProgress(1);
    
    // Remove autocomplete dropdown if it exists
    const autocompleteDropdown = qs('.autocomplete-dropdown');
    if (autocompleteDropdown) {
      autocompleteDropdown.remove();
    }
  }

  function readFormData() {
    const form = qs(SELECTORS.contactForm);
    const data = new FormData(form);
    return {
      name: (data.get('name') || '').toString().trim(),
      phone: (data.get('phone') || '').toString().trim(),
      email: (data.get('email') || '').toString().trim(),
      serviceLocation: (data.get('serviceLocation') || '').toString().trim(),
      preferredDate: (data.get('preferredDate') || '').toString().trim(),
      preferredTime: (data.get('preferredTime') || '').toString().trim(),
      vehicleYear: (data.get('vehicleYear') || '').toString().trim(),
      vehicleMake: (data.get('vehicleMake') || '').toString().trim(),
      vehicleModel: (data.get('vehicleModel') || '').toString().trim(),
      problemDescription: (data.get('problemDescription') || '').toString().trim(),
    };
  }

  function setError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message || '';
  }

  function validateForm() {
    const { name, phone, email, serviceLocation, preferredDate, preferredTime, problemDescription } = readFormData();
    let valid = true;

    // Clear all errors
    setError('error-name', '');
    setError('error-phone', '');
    setError('error-email', '');
    setError('error-location', '');
    setError('error-date', '');
    setError('error-time', '');
    setError('error-description', '');

    if (!name || name.trim().length < 2) {
      setError('error-name', 'Please enter your full name (at least 2 characters).');
      valid = false;
    }

    if (!phone || phone.trim().length < 10) {
      setError('error-phone', 'Please enter a valid phone number (at least 10 digits).');
      valid = false;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('error-email', 'Please enter a valid email address.');
      valid = false;
    }

    if (!serviceLocation || serviceLocation.trim().length < 5) {
      setError('error-location', 'Please enter the service location address.');
      valid = false;
    }

    if (!preferredDate) {
      setError('error-date', 'Please select a preferred date.');
      valid = false;
    }

    if (!preferredTime) {
      setError('error-time', 'Please select a preferred time.');
      valid = false;
    }

    if (!problemDescription || problemDescription.trim().length < 10) {
      setError('error-description', 'Please describe the problem or service needed (at least 10 characters).');
      valid = false;
    }

    return valid;
  }

  function validateLocation(address) {
    // Basic address validation - should contain street number, street name, and city/state
    const addressPattern = /^\d+\s+[a-zA-Z\s]+,\s*[a-zA-Z\s]+,\s*[A-Z]{2}/;
    return addressPattern.test(address) || (address.includes(',') && address.length > 10);
  }

  function validateServiceArea(lat, lng) {
    // Define service area bounds (New Jersey and Pennsylvania)
    const serviceBounds = {
      north: 42.0,
      south: 38.0,
      east: -73.0,
      west: -80.0
    };
    
    return lat >= serviceBounds.south && 
           lat <= serviceBounds.north && 
           lng >= serviceBounds.west && 
           lng <= serviceBounds.east;
  }

  function handleLocationError(error) {
    console.error('Location error:', error);
    
    let errorMessage = 'Location access failed. ';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += 'Location access was denied. Please enter your address manually.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += 'Location information is unavailable. Please enter your address manually.';
        break;
      case error.TIMEOUT:
        errorMessage += 'Location request timed out. Please enter your address manually.';
        break;
      default:
        errorMessage += 'An unknown error occurred. Please enter your address manually.';
        break;
    }
    
    showErrorMessage(errorMessage);
  }

  async function proceedToSchedule() {
    if (!selectedService) {
      // pull from storage if available
      selectedService = sessionStorage.getItem(STORAGE_KEYS.selectedService) || '';
    }

    if (!selectedService) {
      // no service chosen
      backToServices();
      return;
    }

    if (!validateForm()) return;

    const contact = readFormData();
    sessionStorage.setItem(STORAGE_KEYS.contact, JSON.stringify(contact));

    // Show loading state
    const continueBtn = qs(SELECTORS.continueButton);
    if (continueBtn) {
      continueBtn.textContent = 'Submitting...';
      continueBtn.disabled = true;
      continueBtn.classList.add('loading');
    }

    try {
      // Validate service area if location is available
      if (currentLocation && !validateServiceArea(currentLocation.lat, currentLocation.lng)) {
        showErrorMessage('Sorry, we currently only provide service in New Jersey and Pennsylvania. Please contact us for service in other areas.');
        return;
      }

      // Submit service request to backend
      const serviceRequest = {
        service: selectedService,
        ...contact,
        location: currentLocation,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceRequest)
      });

      const result = await response.json();
      
      // Check for success - either result.success === true OR result.requestId exists
      if (result.success === true || result.requestId) {
        // Show success message
        showSuccessMessage(result.message, result.requestId);
        updateProgress(3);
        
        // Clear form data after successful submission
        sessionStorage.removeItem(STORAGE_KEYS.selectedService);
        sessionStorage.removeItem(STORAGE_KEYS.contact);
      } else {
        throw new Error(result.message || 'Failed to submit service request');
      }

    } catch (error) {
      console.error('Error submitting service request:', error);
      showErrorMessage('Failed to submit service request. Please try again or call us directly at (609) 349-0879');
      } finally {
        // Reset button state
        if (continueBtn) {
          continueBtn.textContent = 'Continue to Schedule →';
          continueBtn.disabled = false;
          continueBtn.classList.remove('loading');
        }
      }
  }

  function showSuccessMessage(message, requestId) {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
      <div style="background: #d4edda; color: #155724; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid #c3e6cb;">
        <h4>✅ Service Request Submitted Successfully!</h4>
        <p>${message}</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
        <p>We'll contact you shortly to confirm your service appointment.</p>
        <p><strong>Emergency Line:</strong> <a href="tel:6093490879">(609) 349-0879</a></p>
      </div>
    `;
    
    // Insert after the contact form
    const contactSection = qs(SELECTORS.contactSection);
    if (contactSection) {
      contactSection.appendChild(successDiv);
    }
  }

  function showErrorMessage(message) {
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; border: 1px solid #f5c6cb;">
        <h4>❌ Error</h4>
        <p>${message}</p>
      </div>
    `;
    
    // Insert after the contact form
    const contactSection = qs(SELECTORS.contactSection);
    if (contactSection) {
      contactSection.appendChild(errorDiv);
    }
  }

  function restoreFromStorage() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.contact);
      if (!saved) return;
      const contact = JSON.parse(saved);
      const form = qs(SELECTORS.contactForm);
      if (!form) return;
      ['name','phone','email','vehicleYear','vehicleMake','vehicleModel','problemDescription']
        .forEach((key) => {
          const input = form.elements.namedItem(key);
          if (input && typeof input === 'object') {
            input.value = contact[key] || '';
          }
        });
    } catch {}
  }

  // Hamburger menu functionality
  function toggleHamburger() {
    const hamburger = qs('.hamburger');
    const navMenu = qs('#navMenu');
    
    if (hamburger && navMenu) {
      const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !isExpanded);
      navMenu.classList.toggle('active');
      
      // Prevent body scroll when menu is open
      document.body.style.overflow = !isExpanded ? 'hidden' : '';
    }
  }

  function closeHamburger() {
    const hamburger = qs('.hamburger');
    const navMenu = qs('#navMenu');
    
    if (hamburger && navMenu) {
      hamburger.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // Set minimum date to today
  function setMinDate() {
    const dateInput = qs('#preferredDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Set minimum date for date picker
    setMinDate();
    
    // Hamburger menu
    const hamburger = qs('.hamburger');
    
    if (hamburger) {
      hamburger.addEventListener('click', toggleHamburger);
    }

    // Close menu when clicking on nav links
    qsa('#navMenu a').forEach(link => {
      link.addEventListener('click', closeHamburger);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      const navMenu = qs('#navMenu');
      const hamburger = qs('.hamburger');
      if (navMenu && hamburger && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeHamburger();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeHamburger();
      }
    });

    // Attach handlers for service options
    qsa(SELECTORS.serviceOptions).forEach((el) => {
      el.addEventListener('click', () => selectService(el));
      el.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectService(el);
        }
      });
    });

    // Back and continue buttons
    const backBtn = qs(SELECTORS.backButton);
    const contBtn = qs(SELECTORS.continueButton);
    if (backBtn) backBtn.addEventListener('click', backToServices);
    if (contBtn) contBtn.addEventListener('click', proceedToSchedule);

    // Initial progress
    updateProgress(1);

    // Restore from session if present
    restoreFromStorage();

    // Highlight emergency option subtly (CSS handles reduced motion)
    // No JS needed beyond initial layout
  });
})();
