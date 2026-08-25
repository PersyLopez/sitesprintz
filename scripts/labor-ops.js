#!/usr/bin/env node
/**
 * Managed-care ops helper. Counts two batches/month and declines drips.
 * Never prints claim tokens.
 *
 *   node scripts/labor-ops.js classify "here is the new menu..."
 *   node scripts/labor-ops.js remaining <userId>
 */
import { createLaborLedger } from '../server/services/labor/laborLedger.js';
import {
  classifyLaborRequest,
  declineDripCopy,
  remainingCareBatches,
} from '../server/services/labor/managedCareOps.js';
import { redactLaborSecrets } from '../server/services/labor/laborSecrets.js';

const [command, ...rest] = process.argv.slice(2);

async function main() {
  if (command === 'classify') {
    const message = rest.join(' ');
    const result = classifyLaborRequest(message);
    console.log(JSON.stringify({
      ...result,
      decline: result.kind === 'drip' ? declineDripCopy() : null,
    }));
    return;
  }

  if (command === 'remaining') {
    const userId = rest[0];
    if (!userId) {
      console.error('usage: labor-ops remaining <userId>');
      process.exit(1);
    }
    const now = new Date();
    const rows = await createLaborLedger().listForUserMonth(
      userId,
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
    );
    const remaining = remainingCareBatches(rows);
    console.log(JSON.stringify({
      userId: redactLaborSecrets(userId),
      remaining,
      used: rows.filter((row) => row.sku === 'managed_care' || row.kind === 'batch').length,
    }));
    return;
  }

  console.error('usage: labor-ops classify <message> | remaining <userId>');
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
