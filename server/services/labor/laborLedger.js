import { appendFile, mkdir, readFile } from 'fs/promises';
import path from 'path';

export function defaultLaborLedgerPath() {
  return process.env.LABOR_LEDGER_PATH
    || path.join(process.cwd(), 'data', 'ops', 'labor-ledger.jsonl');
}

function parseLine(line) {
  try {
    const row = JSON.parse(line);
    return row && typeof row === 'object' ? row : null;
  } catch {
    return null;
  }
}

/**
 * Append-only JSONL ledger (ops spreadsheet until volume needs a table).
 * @param {string} filePath
 */
export function createLaborLedger(filePath = defaultLaborLedgerPath()) {
  async function ensureDir() {
    await mkdir(path.dirname(filePath), { recursive: true });
  }

  async function readAll() {
    try {
      const raw = await readFile(filePath, 'utf8');
      return raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map(parseLine)
        .filter(Boolean);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  return {
    async findBySessionId(sessionId) {
      if (!sessionId) return null;
      const rows = await readAll();
      return rows.find((row) => row.sessionId === sessionId) || null;
    },

    async append(entry) {
      await ensureDir();
      const row = {
        ...entry,
        recordedAt: entry.recordedAt || new Date().toISOString(),
      };
      await appendFile(filePath, `${JSON.stringify(row)}\n`, 'utf8');
      return row;
    },

    async listForUserMonth(userId, year, month) {
      const rows = await readAll();
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return rows.filter((row) => (
        row.userId === userId
        && typeof row.recordedAt === 'string'
        && row.recordedAt.startsWith(prefix)
      ));
    },
  };
}
