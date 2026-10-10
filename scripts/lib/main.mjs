// Windows-safe "is this file being run directly?" check shared by every script.
// Compares file paths, not URLs: fileURLToPath handles drive letters (C:\...), backslashes and
// percent-encoded characters such as spaces; win32 paths compare case-insensitively.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function normalPath(p, platform = process.platform) {
  let r = path.resolve(p);
  try { r = fs.realpathSync(r); } catch { /* keep the resolved path */ }
  return platform === 'win32' ? r.toLowerCase() : r;
}

/** True when the module at `metaUrl` (pass import.meta.url) is the script node was started with. */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  return normalPath(fileURLToPath(metaUrl)) === normalPath(argv1);
}
