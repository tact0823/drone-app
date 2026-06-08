import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function readRepo(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function collectTextFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectTextFiles(full, acc);
    } else if (/\.(md|ts|tsx|json|example|mjs)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

// 1. Auth on protected routes
const projectsRoute = read('src/routes/projects.ts');
check(
  '認証チェック',
  projectsRoute.includes('authenticate') && read('src/routes/admin.ts').includes("authorize('admin')"),
  'projects + admin routes use authenticate / authorize',
);

// 2. RBAC on admin
check(
  '権限チェック',
  read('src/routes/admin.ts').includes("authorize('admin')"),
  'admin router requires admin role',
);

// 3. XSS — escapeHtml in PDF builder
check(
  'XSS対策',
  read('src/services/report/htmlBuilder.ts').includes('escapeHtml'),
  'PDF HTML uses escapeHtml',
);

// 4. CSRF
check(
  'CSRF対策',
  read('src/middleware/csrf.ts').includes('verifyCsrfToken') &&
    read('src/routes/projects.ts').includes('validateCsrf'),
  'CSRF validation on mutating project routes',
);

// 5. SQL injection — parameterized queries
const serviceFiles = [
  'src/services/userService.ts',
  'src/services/projectService.ts',
  'src/services/anomalyService.ts',
];
const usesParams = serviceFiles.every((file) => read(file).includes('$1'));
check('SQL Injection対策', usesParams, 'services use $1 parameterized queries');

// 6. Rate limits
check(
  'Rate Limit',
  read('src/middleware/rateLimit.ts').includes('rateLimit') &&
    read('src/middleware/aiRateLimit.ts').includes('rateLimit') &&
    read('src/middleware/oauthRateLimit.ts').includes('rateLimit'),
  'API / AI / OAuth rate limiters present',
);

// 7. CORS
const corsSrc = read('src/middleware/cors.ts');
check(
  'CORS設定',
  corsSrc.includes('credentials: true') && corsSrc.includes('env.frontendUrl'),
  'CORS restricts origin to FRONTEND_URL with credentials',
);

// 8. Cookie security
const authService = read('src/services/authService.ts');
check(
  'Cookie設定',
  authService.includes('httpOnly: true') &&
    authService.includes('secure: env.isProduction') &&
    authService.includes('sameSite: env.cookieSameSite'),
  'token/oauth cookies: httpOnly, secure in prod, sameSite from env',
);

// 9. Environment variables in gitignore
const gitignore = readRepo('.gitignore');
check(
  '環境変数確認',
  existsSync(path.join(repoRoot, '.env.example')) &&
    readRepo('.env.example').includes('JWT_SECRET') &&
    gitignore.includes('.env') &&
    gitignore.includes('.env.production'),
  '.env.example + .env.production.example; .env / .env.production gitignored',
);

// 10. No secrets in docs/README
const secretPatterns = [
  { name: 'OpenAI key', regex: /sk-proj-[a-zA-Z0-9]{10,}/ },
  { name: 'Google secret', regex: /GOCSPX-[a-zA-Z0-9]{10,}/ },
];
const docDirs = [path.join(repoRoot, 'docs'), repoRoot];
const docFiles = docDirs.flatMap((dir) => collectTextFiles(dir)).filter(
  (file) => !file.includes('node_modules') && path.basename(file) !== 'package-lock.json',
);
const leaked: string[] = [];
for (const file of docFiles) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.regex.test(content)) {
      leaked.push(`${path.relative(repoRoot, file)} (${pattern.name})`);
    }
  }
}
check(
  'ドキュメント秘匿',
  leaked.length === 0,
  leaked.length === 0 ? 'no API keys/secrets in docs or README' : leaked.join('; '),
);

// 11. No secret logging in src
const srcFiles = collectTextFiles(path.join(root, 'src'));
const logLeaks: string[] = [];
const logPatterns = [/console\.(log|info|debug)\([^)]*llmApiKey/i, /console\.(log|info|debug)\([^)]*JWT_SECRET/i];
for (const file of srcFiles) {
  const content = readFileSync(file, 'utf8');
  if (logPatterns.some((pattern) => pattern.test(content))) {
    logLeaks.push(path.relative(root, file));
  }
}
check(
  'ログ秘匿',
  logLeaks.length === 0,
  logLeaks.length === 0 ? 'no console.log of API keys or JWT_SECRET' : logLeaks.join(', '),
);

// 12. npm audit
let auditPass = true;
let auditDetail = 'npm audit: no critical/high';
try {
  execSync('npm audit --audit-level=high --json', { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
  const err = error as { stdout?: Buffer; status?: number };
  if (err.stdout) {
    const report = JSON.parse(err.stdout.toString()) as {
      metadata?: { vulnerabilities?: { critical?: number; high?: number } };
    };
    const critical = report.metadata?.vulnerabilities?.critical ?? 0;
    const high = report.metadata?.vulnerabilities?.high ?? 0;
    auditPass = critical === 0 && high === 0;
    auditDetail = `critical=${critical}, high=${high}`;
  } else {
    auditPass = false;
    auditDetail = 'npm audit failed to run';
  }
}
check('npm audit', auditPass, auditDetail);

const failed = results.filter((item) => !item.pass);
console.log('\n=== Security Audit Report ===\n');
for (const item of results) {
  console.log(`${item.pass ? '✅' : '❌'} ${item.name}: ${item.detail}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);

if (failed.length > 0) {
  process.exit(1);
}
