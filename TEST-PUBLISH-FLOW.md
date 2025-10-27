# Test Publish Flow - Complete Verification

## What to Test

### 1. Setup Page
- [ ] Template loads from URL parameter
- [ ] Form fields populate from template data
- [ ] Live preview updates as you type
- [ ] Save draft button works

### 2. Draft Saving
- [ ] Draft saves successfully
- [ ] Preview link works
- [ ] Publish Now button appears

### 3. Payment Modal
- [ ] Email disclaimer appears
- [ ] Plan selection works
- [ ] Email validation works
- [ ] Pay & Publish button works

### 4. Publishing Process
- [ ] Site creates in `/public/sites/{subdomain}/`
- [ ] `site.json` contains all business data
- [ ] `index.html` exists and points to site.json
- [ ] Custom fields preserved
- [ ] Social media links stored
- [ ] Publishing metadata saved

### 5. Published Site Features
- [ ] Site URL works
- [ ] Share buttons appear in footer
- [ ] All share buttons functional
- [ ] Open Graph meta tags update dynamically
- [ ] Business name, description, images display
- [ ] Services/products display
- [ ] Contact information displays
- [ ] Mobile responsive

### 6. Success Screen
- [ ] Shows congratulations message
- [ ] Shows site URL
- [ ] Copy URL button works
- [ ] Visit site button works
- [ ] Share site button works
- [ ] Plan features display
- [ ] Dashboard link works

## Manual Test Steps

1. **Start Test Site:**
   ```bash
   npm start
   ```

2. **Go to Templates:**
   - Visit http://localhost:3000/templates.html
   - Click "Use This" on any template

3. **Customize Site:**
   - Fill in business name
   - Add hero title and subtitle
   - Add hero image URL
   - Add contact information (email, phone, address)
   - Add business hours
   - Add social media links (Facebook, Instagram, Google Maps)
   - Add services with images
   - Fill template-specific fields

4. **Save Draft:**
   - Click "Save Draft (Free)"
   - Verify success message
   - Click "Preview Draft" link
   - Verify preview loads

5. **Publish Site:**
   - Click "Publish Now"
   - Select a plan
   - Enter email (see disclaimer)
   - Click "Pay & Publish"
   - Wait for success screen

6. **Verify Published Site:**
   - Click "Visit Your Site" link
   - Verify site loads correctly
   - Check share buttons in footer
   - Test each share button
   - Check mobile responsiveness
   - Verify all data displays

7. **Test Share Functionality:**
   - Scroll to footer
   - Test Facebook share button
   - Test Twitter share button
   - Test LinkedIn share button
   - Test Copy Link button
   - Verify notification appears

## Expected Results

✅ **Site Created** - In `public/sites/{subdomain}/`  
✅ **Data Preserved** - All business info in site.json  
✅ **Share Buttons** - Visible in footer, all work  
✅ **Rich Preview** - Open Graph tags update  
✅ **Mobile Ready** - Responsive design  
✅ **Success Screen** - All features displayed  
✅ **Copy/Share** - All buttons functional  

## Known Issues to Check

- [ ] Images load correctly
- [ ] Social media links work when clicked
- [ ] Custom fields display (if template has them)
- [ ] All text fits on mobile screens
- [ ] No console errors
- [ ] No broken links

