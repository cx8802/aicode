import { promises as fs } from 'fs';
import { join } from 'path';
import { fileTools } from './src/core/tools/file.ts';
import { Logger } from './src/utils/logger.ts';

const testDir = 'test-file-tools-delete';
const logger = new Logger({ silent: true });

(async () => {
  await fs.mkdir(testDir, { recursive: true });
  const dirPath = join(testDir, 'empty-dir');
  await fs.mkdir(dirPath);

  const result = await fileTools.delete_file.execute(
    { path: dirPath },
    { workspace: testDir, logger }
  );

  console.log('Result:', JSON.stringify(result, null, 2));

  await fs.rm(testDir, { recursive: true, force: true });
})();
