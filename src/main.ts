import { program } from './cli/parser.js';
import { Logger } from './utils/logger.js';

const MIN_NODE_VERSION = '18.0.0';

function checkNodeVersion(): boolean {
  const currentVersion = process.version.replace('v', '');
  const [major] = currentVersion.split('.').map(Number);
  const [minMajor] = MIN_NODE_VERSION.split('.').map(Number);
  return major >= minMajor;
}

async function main(): Promise<void> {
  if (!checkNodeVersion()) {
    console.error(`ERROR: Node.js >= ${MIN_NODE_VERSION} required. Current: ${process.version}`);
    process.exit(2);
  }

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const logger = Logger.getInstance();
    if (error instanceof Error) {
      logger.error(error.message);
      if (logger.isDebug()) {
        logger.debug(error.stack ?? '');
      }
    }
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
