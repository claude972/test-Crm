import { homedir } from 'node:os';
import { join } from 'node:path';

export const getConfigPath = () => join(homedir(), '.kovaa-lab', 'config.json');
