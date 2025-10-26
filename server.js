const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'persylopez99@gmail.com',
    pass: process.env.EMAIL_PASS || 'zqxtnjevaaqzwhul'
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store service requests in memory (in production, use a database)
const serviceRequests = [];

// API Routes
app.post('/api/service-request', async (req, res) => {
  try {
    const requestData = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...req.body,
      status: 'pending'
    };
    
    // Store the request
    serviceRequests.push(requestData);
    
    // Log the request (in production, save to database)
    console.log('New service request:', requestData);
    
    // Send confirmation email
    await sendConfirmationEmail(requestData);
    
    res.json({
      success: true,
      message: 'Service request submitted successfully',
      requestId: requestData.id
    });
    
  } catch (error) {
    console.error('Error processing service request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process service request'
    });
  }
});

// Get all service requests (admin endpoint)
app.get('/api/service-requests', (req, res) => {
  res.json({
    success: true,
    requests: serviceRequests
  });
});

// Update request status
app.put('/api/service-request/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const request = serviceRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({
      success: false,
      message: 'Service request not found'
    });
  }
  
  request.status = status;
  request.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Status updated successfully',
    request
  });
});

// Send confirmation email
async function sendConfirmationEmail(requestData) {
  try {
    console.log('📧 Sending confirmation email to:', requestData.email || requestData.phone);
    
    // Generate map snapshot and links if location data is available
    let htmlEmailContent = '';
    if (requestData.location && requestData.location.lat && requestData.location.lng) {
      const mapSnapshot = generateMapSnapshot(requestData.location.lat, requestData.location.lng);
      const googleMapsLink = generateGoogleMapsLink(requestData.location.lat, requestData.location.lng);
      const appleMapsLink = generateAppleMapsLink(requestData.location.lat, requestData.location.lng);
      const universalMapsLink = generateUniversalMapsLink(requestData.location.lat, requestData.location.lng);
      
      console.log(`   📍 Location: ${requestData.serviceLocation}`);
      console.log(`   🗺️ Map Snapshot: ${mapSnapshot}`);
      
      // Generate HTML email content with clickable map links
      htmlEmailContent = generateHTMLEmail(requestData, mapSnapshot, googleMapsLink, appleMapsLink, universalMapsLink);
    } else {
      // Simple text email if no location data
      htmlEmailContent = generateSimpleHTMLEmail(requestData);
    }
    
    // Send email
    const mailOptions = {
      from: 'persylopez99@gmail.com',
      to: requestData.email || 'persylopez99@gmail.com', // Send to customer or admin if no email
      subject: `Service Request Confirmation - ${requestData.service} - ${requestData.name}`,
      html: htmlEmailContent
    };
    
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

function generateMapSnapshot(lat, lng) {
  // Using OpenStreetMap static map service (no API key required)
  const size = '400x300';
  const zoom = '15';
  const marker = `${lat},${lng}`;
  
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${marker}&maptype=mapnik`;
}

function generateGoogleMapsLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function generateAppleMapsLink(lat, lng) {
  return `http://maps.apple.com/?q=${lat},${lng}`;
}

function generateUniversalMapsLink(lat, lng) {
  // Universal link that works on both Android and iOS
  return `https://www.google.com/maps?q=${lat},${lng}&z=15`;
}

function generateSimpleHTMLEmail(requestData) {
  const serviceNames = {
    'emergency': '🚨 Emergency Service',
    'tire-repair': '🚗 Tire Repair',
    'battery-replacement': '🔋 Battery Service',
    'tire-replacement': '🔄 Tire Replacement',
    'oil-change': '🛢️ Oil Change',
    'brake-service': '🛑 Brake Service',
    'diagnostic': '🔍 Diagnostic',
    'other': '⚙️ Other Service'
  };

  const serviceName = serviceNames[requestData.service] || requestData.service;
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Request Confirmation - Fix&Go Mobile Tire Service</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .service-badge { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
    .info-section { margin: 20px 0; }
    .info-section h3 { color: #1e3c72; margin-bottom: 10px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
    .info-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    .info-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .info-value { color: #333; margin-top: 5px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Fix&Go Mobile Tire Service</h1>
      <p>Service Request Confirmation</p>
    </div>
    
    <div class="content">
      <div class="service-badge">
        <h2>${serviceName}</h2>
        <p>Request submitted on ${currentDate} at ${currentTime}</p>
      </div>

      <div class="info-section">
        <h3>📋 Service Details</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Customer Name</div>
            <div class="info-value">${requestData.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone Number</div>
            <div class="info-value">${requestData.phone}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${requestData.email || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Vehicle</div>
            <div class="info-value">${requestData.vehicleYear} ${requestData.vehicleMake} ${requestData.vehicleModel}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>📍 Service Location</h3>
        <p><strong>Address:</strong> ${requestData.serviceLocation}</p>
      </div>

      <div class="info-section">
        <h3>🔧 Problem Description</h3>
        <p>${requestData.problemDescription}</p>
      </div>

      <div class="info-section">
        <h3>⏰ Preferred Service Time</h3>
        <p><strong>Date:</strong> ${requestData.preferredDate}</p>
        <p><strong>Time:</strong> ${requestData.preferredTime}</p>
      </div>

      <div class="info-section">
        <h3>📞 Next Steps</h3>
        <p>Our team will review your request and contact you within 15 minutes to confirm service details and estimated arrival time.</p>
        <p>If you have any questions or need immediate assistance, please call us at <strong>(609) 349-0879</strong>.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing Fix&Go Mobile Tire Service!</p>
      <p>We're here 24/7 for all your automotive needs.</p>
    </div>
  </div>
</body>
</html>`;
}

function generateHTMLEmail(requestData, mapSnapshot, googleMapsLink, appleMapsLink, universalMapsLink) {
  const serviceNames = {
    'emergency': '🚨 Emergency Service',
    'tire-repair': '🚗 Tire Repair',
    'battery-replacement': '🔋 Battery Service',
    'tire-replacement': '🔄 Tire Replacement',
    'oil-change': '🛢️ Oil Change',
    'brake-service': '🛑 Brake Service',
    'diagnostic': '🔍 Diagnostic',
    'other': '⚙️ Other Service'
  };

  const serviceName = serviceNames[requestData.service] || requestData.service;
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Request Confirmation - Fix&Go Mobile Tire Service</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .service-badge { background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
    .info-section { margin: 20px 0; }
    .info-section h3 { color: #1e3c72; margin-bottom: 10px; border-bottom: 2px solid #e9ecef; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
    .info-item { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    .info-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .info-value { color: #333; margin-top: 5px; }
    .map-section { margin: 30px 0; text-align: center; }
    .map-image { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin: 15px 0; }
    .map-links { margin: 20px 0; }
    .map-link { display: inline-block; background: #007bff; color: white; text-decoration: none; padding: 12px 20px; margin: 5px; border-radius: 5px; font-weight: bold; transition: background 0.3s; }
    .map-link:hover { background: #0056b3; }
    .map-link.google { background: #4285f4; }
    .map-link.apple { background: #000; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
    .urgent { background: #dc3545; color: white; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-weight: bold; }
    @media (max-width: 600px) {
      .info-grid { grid-template-columns: 1fr; }
      .map-links { text-align: center; }
      .map-link { display: block; margin: 10px auto; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Fix&Go Mobile Tire Service</h1>
      <p>Service Request Confirmation</p>
    </div>
    
    <div class="content">
      <div class="service-badge">
        <h2>${serviceName}</h2>
        <p>Request submitted on ${currentDate} at ${currentTime}</p>
      </div>

      <div class="info-section">
        <h3>📋 Service Details</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Customer Name</div>
            <div class="info-value">${requestData.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone Number</div>
            <div class="info-value">${requestData.phone}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div class="info-value">${requestData.email || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Vehicle</div>
            <div class="info-value">${requestData.vehicleYear} ${requestData.vehicleMake} ${requestData.vehicleModel}</div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>📍 Service Location</h3>
        <p><strong>Address:</strong> ${requestData.serviceLocation}</p>
        <p><strong>Coordinates:</strong> ${requestData.location.lat.toFixed(6)}, ${requestData.location.lng.toFixed(6)}</p>
      </div>

      <div class="info-section">
        <h3>🔧 Problem Description</h3>
        <p>${requestData.problemDescription}</p>
      </div>

      <div class="info-section">
        <h3>⏰ Preferred Service Time</h3>
        <p><strong>Date:</strong> ${requestData.preferredDate}</p>
        <p><strong>Time:</strong> ${requestData.preferredTime}</p>
      </div>

      <div class="map-section">
        <h3>🗺️ Service Location Map</h3>
        <p>Click on the map or use the links below to open in your preferred map app:</p>
        
        <a href="${universalMapsLink}" target="_blank">
          <img src="${mapSnapshot}" alt="Service Location Map" class="map-image" />
        </a>
        
        <div class="map-links">
          <a href="${googleMapsLink}" target="_blank" class="map-link google">🗺️ Open in Google Maps</a>
          <a href="${appleMapsLink}" target="_blank" class="map-link apple">🍎 Open in Apple Maps</a>
          <a href="${universalMapsLink}" target="_blank" class="map-link">🌐 Open in Web Browser</a>
        </div>
      </div>

      ${requestData.service === 'emergency' ? '<div class="urgent">🚨 EMERGENCY SERVICE - We will contact you immediately!</div>' : ''}
      
      <div class="info-section">
        <h3>📞 Next Steps</h3>
        <p>Our team will review your request and contact you within 15 minutes to confirm service details and estimated arrival time.</p>
        <p>If you have any questions or need immediate assistance, please call us at <strong>(609) 349-0879</strong>.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Thank you for choosing Fix&Go Mobile Tire Service!</p>
      <p>We're here 24/7 for all your automotive needs.</p>
    </div>
  </div>
</body>
</html>`;
}

// Serve the main website
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Fix&Go server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Access from iPad: http://192.168.1.29:${PORT}`);
  console.log(`🔧 API endpoints:`);
  console.log(`   POST /api/service-request - Submit service request`);
  console.log(`   GET  /api/service-requests - Get all requests (admin)`);
  console.log(`   PUT  /api/service-request/:id/status - Update request status`);
});

module.exports = app;
