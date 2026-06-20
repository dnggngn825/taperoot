import { execSync } from 'node:child_process';

const opts = { stdio: 'inherit' as const, cwd: 'services/api' };
execSync('npx prisma migrate deploy', opts);
execSync('npx prisma db seed', opts);
