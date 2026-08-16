# 🧪 SiteSprintz Manual Testing Runbook

This document is a step-by-step manual testing script designed to verify the user experience, functionality, and responsiveness of **SiteSprintz**. Use this runbook to conduct thorough manual QA cycles before pushing updates to production.

---

## 📋 Pre-Testing Environment Setup

Before starting any manual testing session, ensure the following configurations and services are active:

### 1. Services & Ports
- **Frontend App:** Run `npm run dev` to start the React application. Verify it is running at [http://localhost:5173](http://localhost:5173).
- **Backend API:** Run `npm run dev:backend` or start both simultaneously using `npm run dev:all`. Verify the server is running at [http://localhost:3000](http://localhost:3000).
- **Ngrok Tunnel (OAuth & Webhooks):** Ensure your ngrok tunnel is forwarding to port `3000` (e.g., `ngrok http 3000`). Update your `.env` with the ngrok URL:
  ```env
  NGROK_URL=https://<your-ngrok-subdomain>.ngrok-free.dev
  ```

### 2. Credentials & Test Accounts
*Always run tests on these accounts first. For new registrations, use the email tag syntax (e.g., `test+user1@example.com`).*

| Role | Email | Password | Admin Token |
| :--- | :--- | :--- | :--- |
| **Test User** | `test@sitesprintz.com` | `TestPassword123!` | *N/A* |
| **Test Admin** | `admin@sitesprintz.com` | `AdminPassword123!` | Set in `.env` |
| **New Test Signups** | Use `test+<random>@sitesprintz.com` | `TestPassword123!` | *N/A* |

### 3. Payment Credentials (Stripe Test Mode)
- **Test Card Number:** `4242 4242 4242 4242`
- **Expiration Date:** Any future date (e.g., `12/30`)
- **CVC:** `123`
- **ZIP Code:** `12345` or any 5-digit number

---

## 🎯 Testing Category Quick Reference

- [ ] **P0 (Must Pass):** Core flows, signup-to-publish, auth UX, dashboard & site editor basic functionality, published site forms, mobile layouts.
- [ ] **P1 (High Impact):** Solo/Team booking widgets, cart & checkout, payment upgrades, error banners, loading skeletons, keyboard navigation & skip links.
- [ ] **P2 (Nice to Have):** Showcase gallery opt-in, Lighthouse scores, advanced filters, onboarding checklists.

---

# 🔴 P0 — Must Pass (Core Usability)

## 1. End-to-End User Journeys

### Test 1.1: New User Registration to Site Publish
*Verifies the full new-user onboarding, editing, and publishing funnel.*

**Steps:**
1. Navigate to [http://localhost:5173](http://localhost:5173) in an incognito window.
2. Click the **"Get Started"** or **"Register"** CTA on the homepage.
3. Register using a new email address (e.g., `test+journey@sitesprintz.com`) and password `TestPassword123!`.
4. Choose a template from the template library grid (e.g., click **"Restaurant - Pro"** or **"Bloom Petals Florist"**).
5. Ensure the Editor loads and displays pre-populated demo data in the preview frame.
6. In the left panel, edit the **Business Name** to: `"Journey Bistro"`.
7. Verify the text in the Live Preview frame refreshes and changes to `"Journey Bistro"` in real-time.
8. Click **"Publish"** in the top navigation bar.
9. Click **"Confirm Publish"** on the modal.
10. Click the generated live URL link (e.g., `http://localhost:3000/sites/journey-bistro-<id>/index.html`).

**Expected Results:**
- [ ] Account created successfully; redirected to the dashboard or template selection grid.
- [ ] Editor loads in < 3 seconds with demo data.
- [ ] Preview updates dynamically on typing.
- [ ] Publishing generates a unique, accessible public URL on port `3000`.
- [ ] Public URL loads a fully styled, working site matching the editor preview.

---

### Test 1.2: Guest Quick Publish Flow
*Verifies that guests can build first and sign up later without losing progress.*

**Steps:**
1. Clear cache/cookies, or open a fresh incognito window. Go to [http://localhost:5173/templates](http://localhost:5173/templates) (without logging in).
2. Select any template (e.g., `"Commercial Cleaning - Starter"`).
3. Customize the **Business Name** to `"Guest Cleaners"`. Verify the live preview updates.
4. Click **"Publish"** on the top bar.
5. Verify an Authentication Modal/Page appears, requiring registration or login to save progress.
6. Sign up with a new email (e.g., `test+guest@sitesprintz.com`).
7. Complete signup and verify you are redirected directly to a success page displaying the published URL.
8. Click the URL and verify the name `"Guest Cleaners"` is on the live site.

**Expected Results:**
- [ ] Guests can edit templates freely without an account.
- [ ] Auth wall behaves properly upon clicking "Publish".
- [ ] Custom draft state is preserved and bound to the new account after registration.
- [ ] Redirected to a publishing success page with no loop.

---

### Test 1.3: Returning User Flow
*Verifies returning users can login, retrieve drafts, make updates, and re-publish with zero downtime.*

**Steps:**
1. Navigate to [http://localhost:5173/login](http://localhost:5173/login).
2. Log in using `test@sitesprintz.com` / `TestPassword123!`.
3. Locate an existing published site card on the dashboard. Click **"Edit Site"**.
4. Change the **Tagline** in the editor to `"Updated Quality Services"`.
5. Watch the live preview update.
6. Click **"Publish Changes"**.
7. Keep a separate browser tab open to the previous published site URL. Refresh that tab during the publish process.

**Expected Results:**
- [ ] Login completes smoothly; dashboard loads user sites.
- [ ] Draft content matches the state of the last edit.
- [ ] Re-publishing occurs without causing any 404s or downtime on the live URL.
- [ ] Live URL displays the updated tagline `"Updated Quality Services"` immediately after publish finishes.

---

### Test 1.4: Demo Content Toggle
*Verifies that toggling the demo content switch restores and clears content cleanly.*

**Steps:**
1. Open the editor for any draft site.
2. Find the **"Load Demo Data"** toggle switch (usually in the header or Business Info panel).
3. Toggle **Demo OFF**.
4. Observe that text input fields (Business Name, Tagline, Phone, Services) clear out, and the live preview displays empty fields or placeholders.
5. Toggle **Demo ON**.
6. Observe that all fields populate with relevant demo content, the preview frames refresh, and a green success Toast notification appears in the bottom right corner.

**Expected Results:**
- [ ] Toggling demo OFF clears the custom text values.
- [ ] Toggling demo ON restores the standard demo dataset.
- [ ] Preview frame displays updates immediately without manual reload.
- [ ] Toast notification alerts the user of the toggle state.

---

## 2. Authentication UX

### Test 2.1: Register Validation, Strength, and Duplicate Email
**Steps:**
1. Go to [http://localhost:5173/register](http://localhost:5173/register).
2. Enter an invalid email (e.g., `not-an-email`) and click **"Register"**. Check for error message.
3. Enter password `123` and watch the password strength indicator. Ensure it labels the password as weak/invalid.
4. Try to register with `test@sitesprintz.com` (an existing email in the database). Click **"Register"**.

**Expected Results:**
- [ ] Form displays inline error: `"Please enter a valid email address"`.
- [ ] Weak password prevents registration and displays criteria (e.g., capital letters, numbers, length).
- [ ] Submitting a duplicate email displays: `"Email already in use. Please log in instead."` (no raw SQL errors).

---

### Test 2.2: Login Error Handling
**Steps:**
1. Go to [http://localhost:5173/login](http://localhost:5173/login).
2. Submit with blank fields. Check for inline validation.
3. Submit email `test@sitesprintz.com` with a wrong password `WrongPassword!`.

**Expected Results:**
- [ ] Blank submission fails with `"Required fields cannot be empty"`.
- [ ] Wrong password displays `"Invalid email or password. Please try again."`.
- [ ] No raw database stack traces or generic 500 pages shown.

---

### Test 2.3: Logout & Route Guarding
**Steps:**
1. Log in to the application and go to [http://localhost:5173/dashboard](http://localhost:5173/dashboard).
2. Click the **"Logout"** button in the navigation header.
3. Verify redirection to the login or home page.
4. Press the browser's **Back** button.
5. Attempt to manually navigate to [http://localhost:5173/dashboard](http://localhost:5173/dashboard).

**Expected Results:**
- [ ] Redirected to `/login` or `/` immediately on click.
- [ ] Local storage/cookies cleared of authentication JWT tokens.
- [ ] Back button does not load the authenticated dashboard (redirects back to login).
- [ ] Manual access to protected paths is blocked, redirecting to `/login`.

---

### Test 2.4: Password Reset Flow
**Steps:**
1. Go to [http://localhost:5173/forgot-password](http://localhost:5173/forgot-password).
2. Enter `test@sitesprintz.com` and submit.
3. Since local email configuration outputs to console/logs in development, inspect the backend server log (`server.log` or console output) for the reset link containing the token:
   `http://localhost:5173/reset-password?token=<token>`
4. Copy and paste the link into your browser.
5. Enter a new password `NewPassword123!` and submit.
6. Verify you can log in with the new password, and verify the old password is now rejected.

**Expected Results:**
- [ ] Request triggers success message: `"Password reset link has been sent to your email"`.
- [ ] Reset page accepts the token, enforces password strength, and confirms password change.
- [ ] User can log in with the new credentials.

---

### Test 2.5: Google OAuth Login (via Ngrok)
**Steps:**
1. Open your browser to your ngrok URL: `https://<your-ngrok-subdomain>.ngrok-free.dev/login`.
2. Click **"Sign in with Google"**.
3. Complete the Google auth popup with test credentials.
4. Ensure no redirect loop occurs and you land on the dashboard.

**Expected Results:**
- [ ] Seamless redirect to Google consent screen and back to the platform.
- [ ] User profile dashboard displays Google profile picture and name.
- [ ] No redirect loops or white screens.

---

## 3. Dashboard & Site Management

### Test 3.1: Empty State UI & Clear CTA
**Steps:**
1. Log in with a clean user account that has no created sites (e.g., `test+clean@sitesprintz.com`).
2. Observe the dashboard landing page.

**Expected Results:**
- [ ] No empty grid displays. Instead, a clean "Empty State" UI panel is visible.
- [ ] Displays friendly copy: `"You don't have any sites yet. Let's create your first site!"`.
- [ ] A prominent, styled **"Create New Site"** button is center stage.

---

### Test 3.2: Site Card Information Checks
**Steps:**
1. Go to the dashboard on an account with existing sites.
2. Examine the individual site cards in the grid.

**Expected Results:**
- [ ] Cards display the **Business Name** prominently.
- [ ] Shows the selected **Template Name** (e.g., `"Restaurant Pro"`).
- [ ] Displays the current publication **Status Badge** (e.g., `Draft` in grey/yellow, `Published` in green).
- [ ] Displays the **Last Updated** relative timestamp (e.g., `"Updated 2 hours ago"`).

---

### Test 3.3: Draft Autosave & Navigation Persistence
**Steps:**
1. Open the editor for an active draft.
2. Edit the business description field in the editor panel.
3. Wait for the auto-save indicator in the header to show `"Saved"`.
4. Close the browser tab or click **"Back to Dashboard"**.
5. Re-open the editor for the same site and inspect the field.

**Expected Results:**
- [ ] Draft changes are persisted in the database.
- [ ] Content appears exactly as left upon returning.
- [ ] No data is lost due to navigation.

---

### Test 3.4: Delete Site Flow
**Steps:**
1. From the dashboard, find a site card you wish to delete.
2. Click the **"Delete"** icon/button on the card.
3. Verify that a confirmation modal/dialog displays, warning that this is permanent.
4. Click **"Confirm Delete"**.
5. Attempt to visit the URL of that site if it was previously published.

**Expected Results:**
- [ ] Modal blocks UI; cancel button returns user to dashboard safely.
- [ ] Confirmed delete immediately removes the card from the dashboard grid.
- [ ] Live URL for the deleted site returns a clean **404 Not Found** page.

---

### Test 3.5: Published Site Updates & Zero-Downtime Re-publishing
**Steps:**
1. View a published site at its live URL.
2. In a separate tab, open its editor.
3. Make several styling changes (change font style, swap primary colors, or edit descriptions).
4. Click **"Publish Changes"**.
5. Refresh the live site URL tab repeatedly during this step.

**Expected Results:**
- [ ] Live site remains accessible to visitors throughout the republishing cycle.
- [ ] Old layout is immediately swapped for the new layout once the server confirms publication success.
- [ ] No partial rendering or broken styles visible during transition.

---

## 4. Editor Usability & Content Management

### Test 4.1: Autosave Indicator & No Data Loss
**Steps:**
1. Open the editor. Make a text change in the business name field.
2. Watch the status indicator in the top right.
3. Verify that the indicator moves from `"Saving..."` to `"All changes saved"`.
4. Simulate a refresh/crash of the editor tab. Verify that no prompt alerts you of unsaved changes if the save status is complete.

**Expected Results:**
- [ ] Auto-save triggers within 2 seconds of typing pause.
- [ ] Status updates accurately.
- [ ] Verification on reload shows all inputs successfully saved.

---

### Test 4.2: Image Upload Area
**Steps:**
1. Go to the editor. Find the image upload component (e.g., Hero image edit).
2. Drag and drop a valid image file (`.jpg` or `.png`, < 2MB) into the target box. Verify hover effects.
3. Observe the loading progress indicator.
4. Verify the image thumbnail preview updates.
5. Drag in an invalid file type (e.g., `document.pdf`).

**Expected Results:**
- [ ] Drop target outlines/glows when file is hovered over the area.
- [ ] Progress bar/spinner indicates active upload.
- [ ] Uploaded image appears as the background or in the thumbnail block.
- [ ] PDF upload is rejected with a toast error: `"Invalid file format. Please upload JPEG, PNG or WebP."`.

---

### Test 4.3: Services/Products CRUD and Reordering
**Steps:**
1. Navigate to the **Services** or **Products** tab in the editor.
2. Click **"Add Service"**. Input Name, Price, and Description, then save.
3. Edit the newly created service. Modify the price.
4. Drag the bottom service card and drop it above the top service card to reorder.
5. Delete one of the services.
6. Verify changes reflect in the preview pane.

**Expected Results:**
- [ ] Services add, edit, and delete inline without full page reloads.
- [ ] Drag handle allows smooth sorting with visual drop indicator.
- [ ] Reordered list matches preview sequence.

---

### Test 4.4: Inline Form Validations
**Steps:**
1. Navigate to the **Business Info** or **Contact Info** section of the editor.
2. In the **Phone Number** field, type letters (e.g., `"abcdef"`).
3. In the **Email** field, type an invalid address (e.g., `"info@test"`).
4. Leave a required field (like **Business Name**) empty.
5. Attempt to click save or watch auto-save react.

**Expected Results:**
- [ ] Phone input rejects letters or displays an validation warning below the field: `"Please enter a valid phone number format"`.
- [ ] Email field displays inline error: `"Please enter a valid email address"`.
- [ ] Required fields display clear highlight boundary in red.

---

### Test 4.5: Keyboard Shortcuts
**Steps:**
1. Focus your cursor inside the editor area.
2. Press `Cmd+S` (Mac) or `Ctrl+S` (Windows). Verify manual save action.
3. Press `Cmd+P` (Mac) or `Ctrl+P` (Windows). Verify preview modal trigger.
4. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows). Verify publish modal trigger.

**Expected Results:**
- [ ] `Cmd+S` triggers manual database save & displays success toast.
- [ ] `Cmd+P` toggles between editor view and fullscreen preview view.
- [ ] `Cmd+Shift+P` opens the publish confirmation modal directly.
- [ ] Default browser actions (e.g. print dialog for `Cmd+P`) are blocked via `event.preventDefault()`.

---

### Test 4.6: Undo/Redo Engine
**Steps:**
1. In the editor, select a text input box and change the text.
2. Add a new service card.
3. Press `Cmd+Z` (Undo). Verify the text reverts.
4. Press `Cmd+Z` again. Verify the service card is removed.
5. Press `Cmd+Shift+Z` or `Cmd+Y` (Redo). Verify actions re-apply sequentially.

**Expected Results:**
- [ ] Undo history tracks both minor text updates and structural layout changes (adding/removing sections).
- [ ] Redo correctly restores the reverted state.
- [ ] Toast notification details the action taken (e.g., `"Undone: Add Service"`).

---

### Test 4.7: Save Error Recovery UI
**Steps:**
1. Open the editor.
2. Open Chrome Developer Tools and go to the Network tab. Toggle network speed to **Offline** (simulating connection loss).
3. Make an edit to a text field in the editor.
4. Verify the Save indicator changes to `"Failed to Save"` and a retry warning banner or button appears.
5. Toggle network back to **Online**.
6. Click **"Retry Save"** on the banner.

**Expected Results:**
- [ ] System does not crash or silently fail.
- [ ] Shows warning banner: `"Network connection lost. Offline edits are saved locally. Click retry once online."`.
- [ ] Online restoration allows the user to re-sync data without data loss.

---

## 5. Published Site (Customer-Facing)

### Test 5.1: Contact Form Submission & Database Verification
**Steps:**
1. Open a published site URL in a browser tab.
2. Scroll to the **Contact Us** section.
3. Fill out the contact form:
   - **Name:** `"Test Customer"`
   - **Email:** `"customer@example.com"`
   - **Phone:** `"(555) 019-2834"`
   - **Message:** `"Looking for a custom business inquiry."`
4. Click **"Send Message"**.
5. Verify success state.
6. Open your developer console or backend database dashboard. Verify a new record has been inserted into the contact form submissions table matching this entry.

**Expected Results:**
- [ ] Form validates required fields inline.
- [ ] Clicking send shows a success toast: `"Message sent successfully! We will get back to you shortly."`.
- [ ] Form fields clear out.
- [ ] Entry appears immediately in the database and in the site owner's dashboard inbox.

---

### Test 5.2: CTA Navigation & Horizontal Scroll Checks
**Steps:**
1. Load the published site.
2. Click all CTA buttons (e.g., `"Book Now"`, `"View Menu"`, `"Contact Us"`).
3. Verify they scroll smoothly to the correct section or open the correct modals.
4. Using browser developer tools, set viewport width to mobile width (`320px` to `480px`).
5. Swipe horizontally across the page. Verify if the page shifts or has horizontal whitespace.

**Expected Results:**
- [ ] Smooth scrolling operates on all anchor link CTAs.
- [ ] No dead links or unclickable CTAs.
- [ ] No horizontal scrollbars exist on mobile width (overflow is styled correctly).

---

### Test 5.3: Gap Check: Reviews Widget and About Section Rendering
**Steps:**
1. Ensure the published template contains both **Google Reviews** and **About Section** mock data in the editor.
2. Open the published site.
3. Inspect the layout for:
   - An **About Section** displaying the customized description and profile image.
   - A **Reviews Widget** showing star ratings, review text, and reviewer names.

**Expected Results:**
- [ ] About section is fully rendered and readable.
- [ ] Reviews widget displays reviews dynamically (mock reviews display correctly).
- [ ] No empty spacing or broken UI grids where widgets should load.

---

## 6. Mobile Responsiveness (Every Page)

### Test 6.1: Multi-Device Responsive Viewports
**Steps:**
1. Test the following pages: **Homepage**, **User Dashboard**, **Template Catalog Grid**, **Site Editor**, and **Published Site URLs**.
2. Resize browser or use DevTools device mode to verify layouts at:
   - **375px** (iPhone SE)
   - **768px** (iPad)
   - **1920px** (Desktop Monitor)

**Expected Results:**
- [ ] Text size scales appropriately; no overlapping text lines.
- [ ] Layout grid drops from multiple columns to a single column on mobile/tablet viewports.
- [ ] Forms do not require pinch-to-zoom to read inputs or click labels.

---

### Test 6.2: Hamburger Menu & Touch Target Size
**Steps:**
1. In mobile view, find the navigation header.
2. Click the **Hamburger Menu** icon.
3. Verify the menu opens smoothly (sliding down or in from the side).
4. Tap different menu links and close buttons.
5. Verify that all clickable elements have an interactive target area of at least **44px x 44px**.

**Expected Results:**
- [ ] Navigation menu opens and closes without lagging.
- [ ] Links do not sit too close together (preventing accidental clicks).
- [ ] Menu items fit fully within the mobile screen limits.

---

### Test 6.3: Modals and Sidebars Viewport Checks
**Steps:**
1. Open various modals (e.g., delete confirmation, image uploads) and sidebar items (e.g., e-commerce cart drawer) on mobile view.
2. Try scrolling the contents inside the modal/sidebar.

**Expected Results:**
- [ ] Modals fit within mobile screen bounds (max-width `90%` of viewport width).
- [ ] Content does not overflow or cut off outside the viewport.
- [ ] Backdrops blur or darken the background, locking background scroll.

---

# 🟡 P1 — High-Impact Usability (Pro Features)

## 7. Booking Widget (Solo vs. Team)

### Test 7.1: Solo Mode Booking Flow
**Steps:**
1. In the editor, navigate to the **Booking Configuration** panel.
2. Set Booking Mode to: **"Solo"**.
3. Fill out the details:
   - **Provider Name:** `"Sarah Jenkins"`
   - **Niche/Specialty:** `"Hair Stylist"`
   - **Calendly/Booking URL:** `https://calendly.com/sarah-hair-test`
4. Save and Publish the site.
5. Open the published site URL. Navigate to the Booking section.

**Expected Results:**
- [ ] Published site widget skips the provider selection stage.
- [ ] Widget directly shows a calendar grid or a primary CTA: `"Book with Sarah Jenkins"`.
- [ ] Clicking booking opens the configured booking URL in a modal or new tab.

---

### Test 7.2: Team Mode Booking Flow
**Steps:**
1. In the editor, navigate to the **Booking Configuration** panel.
2. Set Booking Mode to: **"Team"**.
3. Add multiple team members:
   - **Member 1:** Name: `"Sarah Jenkins"`, Specialty: `"Hair Stylist"`, URL: `url1`
   - **Member 2:** Name: `"Marcus Miller"`, Specialty: `"Colorist"`, URL: `url2`
4. Enable the **"Any Available"** option.
5. Save and Publish.
6. Navigate to the booking section on the published site.

**Expected Results:**
- [ ] Step 1 of the booking widget asks the user to: `"Choose a Service Provider"`.
- [ ] Specialty filter buttons (e.g., `"Hair Stylist"`, `"Colorist"`) appear at the top.
- [ ] Clicking a filter screens out team members who do not match.
- [ ] An Option card for **"Any Available Provider"** is visible.
- [ ] Selecting a provider redirects to their specific calendar view.

---

### Test 7.3: Booking Creation to Dashboard Integration
**Steps:**
1. Go to the published site.
2. Complete a test booking via the embedded booking widget.
3. Log in as the site owner and go to [http://localhost:5173/dashboard](http://localhost:5173/dashboard).
4. Click the **"Bookings"** tab.
5. Search for the newly created booking details.

**Expected Results:**
- [ ] The booking appears instantly in the Bookings dashboard list.
- [ ] Displays customer name, chosen date/time, selected provider, and booking status (`Pending` / `Confirmed`).
- [ ] Counter badge increments on the dashboard sidebar.

---

## 8. E-Commerce Flow

### Test 8.1: Products CRUD Management in Editor
**Steps:**
1. Open the editor for a site with E-commerce enabled (Pro tier).
2. Go to the **Products** section.
3. Click **"Add Product"**. Upload product image, set title `"Artisan Mug"`, price `$24.99`, inventory count `10`, and category `"Merch"`.
4. Save. Edit the product to change price to `$19.99`.
5. Delete an old test product from the product list.

**Expected Results:**
- [ ] Adding products displays a thumbnail image preview.
- [ ] Validation prevents negative pricing or inventory values.
- [ ] Products save to database drafts correctly.

---

### Test 8.2: Customer Cart & Checkout Journey
**Steps:**
1. Visit the live published site with E-commerce enabled.
2. Click **"Add to Cart"** on `"Artisan Mug"`.
3. Verify the floating shopping cart drawer slides in.
4. Verify the header cart badge count changes from `0` to `1`.
5. In the cart drawer, increase quantity to `2`. Confirm total price updates.
6. Click **"Proceed to Checkout"**.
7. Complete checkout in Stripe Test Mode using the test card credentials.

**Expected Results:**
- [ ] Cart drawer updates total pricing dynamically.
- [ ] Stripe checkout displays correct business name and product items.
- [ ] Redirected back to the success thank-you page after payment completes.

---

### Test 8.3: Orders Dashboard Integration
**Steps:**
1. Log in to the site owner dashboard.
2. Go to the **Orders** tab.
3. Locate the order placed in Test 8.2.
4. Filter orders by status `"Paid"`.
5. Click **"Mark as Fulfilled"** on the order.

**Expected Results:**
- [ ] Order list displays item details, customer name, delivery address, and date.
- [ ] Order status updates successfully.
- [ ] Backend sends a notification email / console log confirmation to the customer.

---

## 9. Payments & Subscriptions

### Test 9.1: Free Trial Counter & Feature Access
**Steps:**
1. Register a new user. Go to the dashboard.
2. Look for the **Subscription Banner** or counter.
3. Verify you can access Pro features (e.g. customizing booking/products in draft editor).

**Expected Results:**
- [ ] Banner clearly displays: `"You have 14 days left in your Free Trial"`.
- [ ] All features (Starter, Pro, Premium templates) are unlocked for drafting.

---

### Test 9.2: Stripe Upgrade Checkout
**Steps:**
1. Click the **"Upgrade Now"** button on the Trial Banner or Billing page.
2. Select the **Pro Plan ($45/month)**.
3. Enter test card details on the Stripe payment page.
4. Submit payment and wait for redirection.

**Expected Results:**
- [ ] Redirection to the platform landing page with a success toast.
- [ ] Billing status on dashboard changes to `"Active: Pro Plan"`.
- [ ] Trial banner is replaced with billing plan info.

---

### Test 9.3: Publish Gate Enforcement
**Steps:**
1. Create a draft site under a free tier / expired trial account.
2. Edit sections, colors, and layout. (Verification: editing must remain free).
3. Click **"Publish"**.
4. Observe the redirection or upgrade modal block.

**Expected Results:**
- [ ] Editing is completely free of charge.
- [ ] Clicking publish displays: `"Upgrade Required: Please choose a subscription plan to make your site live."`.
- [ ] Restricts publishing until billing webhook successfully confirms subscription.

---

## 10. Feedback, Loaders & Error Pages

### Test 10.1: Toast Notifications Coverage
**Steps:**
1. Trigger the following actions in the application:
   - Manual Save (`Cmd+S`)
   - Publish Success
   - File Upload complete
   - Account Details Update
   - Form Submission Validation failure

**Expected Results:**
- [ ] Dynamic Toast cards pop up in the bottom right corner.
- [ ] Auto-dismiss occurs after 4 seconds.
- [ ] Color matches status: Green for Success, Red for Error, Yellow for Info/Warning.

---

### Test 10.2: Loading Skeletons & Disabled Button States
**Steps:**
1. Refresh the dashboard with a simulated slow network (DevTools -> 3G throttling).
2. Look at the grid areas before content loads.
3. Double click forms and submit buttons rapidly.

**Expected Results:**
- [ ] Skeleton cards render showing layout structure (no sudden screen jerks or blank pages).
- [ ] Submit buttons turn disabled and show loading spinners on first click, preventing double submissions.

---

### Test 10.3: Error Pages UX
**Steps:**
1. Attempt to visit a non-existent route: [http://localhost:5173/non-existent-page](http://localhost:5173/non-existent-page).
2. Trigger a mock backend server error (e.g. disconnect DB and request data).

**Expected Results:**
- [ ] Displays user-friendly 404 / 500 error page.
- [ ] Contains visual graphics, helpful copy, and a primary CTA link back to `/dashboard` or `/`.
- [ ] Raw system stack traces are hidden from view.

---

## 11. Accessibility (A11y) Pass

### Test 11.1: Keyboard Tab Order & Focus Rings
**Steps:**
1. Open the editor page. Unplug your mouse.
2. Use the `Tab` key to traverse the editor controls from top to bottom.
3. Verify that the active selection outline (Focus Ring) is clearly visible on every button, input, and link.

**Expected Results:**
- [ ] Focus order moves logical from top-left to bottom-right.
- [ ] Focus rings are high contrast (e.g. bright blue/orange border).
- [ ] Tab trapping is avoided (you can navigate out of any section using tab).

---

### Test 11.2: Modal Focus Trap & Skip Links
**Steps:**
1. Press `Cmd+P` to open the preview modal.
2. Press the `Tab` key. Verify focus stays inside the modal container and does not leak back to behind the backdrop.
3. Press `Escape` key. Verify the modal closes.
4. Refresh homepage. Press `Tab` once. Look for a **"Skip to Main Content"** link.

**Expected Results:**
- [ ] Focus is trapped within modal boundaries while active.
- [ ] `Escape` key functions on all modals.
- [ ] Skip link appears, allowing keyboard users to jump past navigation headers.

---

### Test 11.3: Screen Reader Labels & Reduced Motion
**Steps:**
1. Check that complex graphical buttons (like icons) have `aria-label` or `title` tags.
2. In your OS settings, toggle **"Reduce Motion"** to ON.
3. Navigate the SiteSprintz app. Verify that parallax scroll effects, sliding drawer animations, and rotating hero grids are static or use simple fades.

**Expected Results:**
- [ ] CSS respect `@media (prefers-reduced-motion: reduce)` rules.
- [ ] Icon buttons have descriptive alt tags/aria labels.

---

## 12. Cross-Browser Consistency

### Test 12.1: Browser Comparison Matrices
Perform the following core checks across **Chrome, Firefox, Safari, Edge, and Mobile iOS/Android Safari**:

| Feature to Check | Chrome | Firefox | Safari | Edge | Mobile Safari |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Registration / Login** | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Dashboard Grid Rendering** | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Editor Live Preview Frame** | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Stripe Checkout Popups** | [ ] | [ ] | [ ] | [ ] | [ ] |
| **Published Site Layouts** | [ ] | [ ] | [ ] | [ ] | [ ] |

---

# 🟢 P2 — Nice to Have (Post-Launch)

## 13. Showcase Gallery & Opt-In

### Test 13.1: Showcase Navigation & Filters
**Steps:**
1. Go to the public Showcase Gallery page at [http://localhost:5173/showcase](http://localhost:5173/showcase).
2. Filter showcase sites by niche (e.g. `"Retail"`, `"Restaurant"`).
3. Search for a specific live site name.
4. Click on a site preview card.

**Expected Results:**
- [ ] Gallery loads grid with thumbnail screenshots.
- [ ] Filter updates the displayed sites list without full page refreshes.
- [ ] Click opens the live URL in a separate window tab.
- [ ] Users can toggle opt-in settings from their site settings card.

---

## 📝 Test Logging Sheet
*Print or copy this template for every manual test cycle:*

**Session Date:** ________________________  
**Tester Name:** ________________________  
**OS & Browser:** _______________________  

| Category | Total Tests | Passed | Failed | Blocked |
| :--- | :---: | :---: | :---: | :---: |
| **1. End-to-End** | 4 | | | |
| **2. Auth UX** | 5 | | | |
| **3. Dashboard** | 5 | | | |
| **4. Editor Usability** | 7 | | | |
| **5. Published Site** | 3 | | | |
| **6. Mobile UX** | 3 | | | |
| **7. Booking Widget** | 3 | | | |
| **8. E-Commerce** | 3 | | | |
| **9. Subscriptions** | 3 | | | |
| **10. Feedback/Loaders**| 3 | | | |
| **11. Accessibility** | 3 | | | |
| **12. Cross-Browser** | 5 | | | |
| **13. Showcase Gallery**| 1 | | | |
| **TOTALS** | **47** | | | |

### 🚨 Discovered Bugs & Issues
1. *[Describe issue, priority level, steps to reproduce, and screenshots if applicable]*
2. *[Describe issue...]*
