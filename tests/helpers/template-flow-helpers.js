/**
 * Helper functions for template-to-publish E2E tests
 * Eliminates code duplication and improves maintainability
 */

/**
 * Fill registration form
 */
export async function fillRegistrationForm(page, email, password, confirmPassword = null) {
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  
  const confirmField = page.getByLabel(/confirm.*password/i);
  if (await confirmField.count() > 0) {
    await confirmField.fill(confirmPassword || password);
  }

  const termsCheckbox = page.getByRole('checkbox', { name: /terms|agree/i });
  if (await termsCheckbox.count() > 0) {
    await termsCheckbox.check();
  }
}

/**
 * Submit registration form
 */
export async function submitRegistration(page) {
  await page.getByRole('button', { name: /sign up|register|create account/i }).click();
}

/**
 * Select template by name
 */
export async function selectTemplate(page, templateName) {
  // Try data-testid first, then data-template attribute, then link
  const templateByTestId = page.getByTestId(`template-${templateName}`);
  if (await templateByTestId.count() > 0) {
    await templateByTestId.click();
    return;
  }

  const templateByDataAttr = page.locator(`[data-template="${templateName}"]`).first();
  if (await templateByDataAttr.count() > 0) {
    await templateByDataAttr.click();
    return;
  }

  const templateByLink = page.getByRole('link', { name: new RegExp(templateName, 'i') });
  if (await templateByLink.count() > 0) {
    await templateByLink.click();
  }
}

/**
 * Fill business information form
 */
export async function fillBusinessInfo(page, businessName, subdomain = null, email = null, phone = null) {
  // Fill business name
  const businessNameField = page.getByTestId('business-name-input');
  if (await businessNameField.count() > 0) {
    await businessNameField.fill(businessName);
  } else {
    const byLabel = page.getByLabel(/business name/i);
    if (await byLabel.count() > 0) {
      await byLabel.fill(businessName);
    } else {
      await page.locator('input[name="businessName"]').first().fill(businessName);
    }
  }

  if (subdomain) {
    const subdomainField = page.getByTestId('subdomain-input');
    if (await subdomainField.count() > 0) {
      await subdomainField.fill(subdomain);
    } else {
      const byLabel = page.getByLabel(/subdomain/i);
      if (await byLabel.count() > 0) {
        await byLabel.fill(subdomain);
      } else {
        const byName = page.locator('input[name="subdomain"]').first();
        if (await byName.count() > 0) {
          await byName.fill(subdomain);
        }
      }
    }
  }

  if (email) {
    const emailField = page.getByTestId('contact-email-input');
    if (await emailField.count() > 0) {
      const currentValue = await emailField.inputValue();
      if (currentValue === '') {
        await emailField.fill(email);
      }
    } else {
      const byName = page.locator('input[name="email"][type="email"]').first();
      if (await byName.count() > 0) {
        const currentValue = await byName.inputValue();
        if (currentValue === '') {
          await byName.fill(email);
        }
      }
    }
  }

  if (phone) {
    const phoneField = page.getByTestId('contact-phone-input');
    if (await phoneField.count() > 0) {
      await phoneField.fill(phone);
    } else {
      const byLabel = page.getByLabel(/phone/i);
      if (await byLabel.count() > 0) {
        await byLabel.fill(phone);
      } else {
        const byName = page.locator('input[name="phone"], input[type="tel"]').first();
        if (await byName.count() > 0) {
          await byName.fill(phone);
        }
      }
    }
  }
}

/**
 * Click publish button
 */
export async function clickPublish(page) {
  const publishButton = page.getByTestId('publish-button');
  if (await publishButton.count() > 0) {
    await publishButton.click();
  } else {
    await page.getByRole('button', { name: /publish|go live/i }).click();
  }

  // Handle confirmation modal if exists
  const confirmButton = page.getByRole('button', { name: /publish|confirm/i });
  if (await confirmButton.count() > 0) {
    await confirmButton.waitFor({ timeout: 2000 }).catch(() => {});
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }
}

/**
 * Wait for publish success
 */
export async function waitForPublishSuccess(page) {
  await Promise.race([
    page.waitForURL(/\/dashboard|\/sites/i, { timeout: 15000 }),
    page.getByText(/published|success|live/i).waitFor({ timeout: 15000 })
  ]);
}

