// fileSelector.js
import { FILE_PRIORITY_RULES } from './schema.js';

// glob / matchesAny / pickFirst 유틸 

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*');   
  return new RegExp(`(^|/)${escaped}$`);
}

function matchesAny(filePath, patterns) {
  const normalized = filePath.replace(/\\/g, '/');
  return patterns.some(pattern => {
    if (pattern.includes('*')) return globToRegex(pattern).test(normalized);
    return normalized === pattern || normalized.endsWith('/' + pattern);
  });
}

function pickFirst(fileMap, priorityList, role) {
  for (const pattern of priorityList) {
    for (const [path, content] of fileMap) {
      if (matchesAny(path, [pattern])) return { path, content, role };
    }
  }
  return null;
}

function pickEntryPoints(fileMap, maxCount = 3) {
  const results = [];
  for (const pattern of FILE_PRIORITY_RULES.entryPoints) {
    if (results.length >= maxCount) break;
    for (const [path, content] of fileMap) {
      if (results.length >= maxCount) break;
      if (matchesAny(path, [pattern]) && !results.find(f => f.path === path)) {
        results.push({ path, content, role: 'source' });
      }
    }
  }
  return results;
}

function pickRequirementsTxt(fileMap) {
  const candidates = [
    'requirements.txt', 'requirements/base.txt',
    'requirements/prod.txt', 'requirements-prod.txt',
  ];
  return pickFirst(fileMap, candidates, 'config');
}

// detectPackageManager
// - 반드시 manifest(package.json 등)가 있을 때만 해당 PM 반환
// - lock 파일 단독으로 PM을 결정하지 않음

function detectPackageManager(fileMap) {
  const paths = [...fileMap.keys()];

  const has = name => paths.some(p => p === name || p.endsWith('/' + name));

  // Node: package.json 필수, lock 파일로 세분화
  if (has('package.json')) {
    if (has('pnpm-lock.yaml'))    return 'pnpm';
    if (has('yarn.lock'))         return 'yarn';
    if (has('package-lock.json')) return 'npm';
    return 'npm';                 // lock 없으면 npm 기본
  }

  // Python
  if (has('poetry.lock') && has('pyproject.toml')) return 'poetry';
  if (has('Pipfile') || has('Pipfile.lock'))        return 'pipenv';
  if (has('requirements.txt') || has('pyproject.toml')) return 'pip';

  // Rust: Cargo.toml 필수
  if (has('Cargo.toml')) return 'cargo';

  // Go: go.mod 필수
  if (has('go.mod')) return 'go modules';

  // JVM
  if (has('pom.xml'))                              return 'maven';
  if (has('build.gradle') || has('build.gradle.kts')) return 'gradle';

  // Ruby
  if (has('Gemfile')) return 'bundler';

  return null;
}

// 확장자 필터 

const INCLUDE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.jsx',
  '.ts', '.tsx',
  '.py',
  '.java', '.kt', '.scala', '.groovy',
  '.go',
  '.rs',
  '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.rb', '.php', '.swift', '.cs', '.fs',
  '.sh', '.bash',
  '.yaml', '.yml',
  '.json', '.toml',
  '.txt',    // requirements.txt
  '.xml',    // pom.xml
  '.kts',    // build.gradle.kts
  '.mod',    // go.mod
  '.sql',
  '.md', '.mdx',
]);

const EXCLUDE_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.pdf', '.log', '.lock', '.csv',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.class', '.pyc', '.pyo', '.pyd',
  '.map', '.wasm',
  '.mp4', '.mp3', '.wav', '.mov',
  '.ttf', '.otf', '.woff', '.woff2',
]);

const NAMED_ALLOWLIST = new Set([
  'Makefile', 'makefile', 'GNUmakefile',
  'Dockerfile', 'Procfile', 'Gemfile', 'Rakefile',
  '.env.example', '.env.sample', '.env.template', '.env.local.example',
]);

function passExtFilter(filePath) {
  const filename = filePath.split('/').pop();
  if (NAMED_ALLOWLIST.has(filename)) return true;
  if (/\.min\.(js|css)$/.test(filename)) return false;
  if (/\.d\.ts$/.test(filename)) return false;
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return false;
  const ext = filename.slice(dotIdx).toLowerCase();
  if (EXCLUDE_EXT.has(ext)) return false;
  return INCLUDE_EXT.has(ext);
}

// 블랙리스트


const BLACKLIST_DIRS = new Set([
  'node_modules', 'vendor', 'venv', '.venv', 'env',
  'dist', 'build', 'out', 'output', 'target',
  '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.mypy_cache', '.pytest_cache',
  'coverage',
  '.git', '.svn', '.vscode', '.idea',
  '.github', '.husky',
  'tests', 'test', '__tests__', '__test__',
  'spec', 'e2e', 'cypress', 'playwright',
  'mocks', 'mock', 'fixtures',
  'migrations',
]);

const BLACKLIST_FILE_RE = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /\.stories\.[jt]sx?$/,
];

function passBlacklist(filePath) {
  const segments = filePath.replace(/\\/g, '/').split('/');
  const filename = segments[segments.length - 1];
  for (const seg of segments.slice(0, -1)) {
    if (BLACKLIST_DIRS.has(seg)) return false;
  }
  if (BLACKLIST_FILE_RE.some(re => re.test(filename))) return false;
  return true;
}

const MAX_CONTEXT_FILE_CHARS = 8_000;

function truncateForContext(content) {
  const text = content || '';
  return text.length > MAX_CONTEXT_FILE_CHARS
    ? text.slice(0, MAX_CONTEXT_FILE_CHARS) + '\n// [TRUNCATED]'
    : text;
}

function markdownFenceFor(content) {
  const runs = String(content || '').match(/`{3,}/g) || [];
  const maxRun = runs.reduce((max, run) => Math.max(max, run.length), 2);
  return '`'.repeat(maxRun + 1);
}

// 가중치 scoring

/**
 * @typedef {'frontend'|'api'|'cli'|'unknown'} Profile
 */

const COMMON_RULES = [
  { re: /^(package\.json|requirements\.txt|pyproject\.toml|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|go\.mod|Makefile|CMakeLists\.txt)$/, score: 100 },
  { re: /(main\.(py|go|rs|js|ts)|app\.(py|js|ts)|index\.(js|ts|jsx|tsx)|server\.(js|ts)|Application\.java|manage\.py)$/, score: 90 },
  { re: /^(vite|next|nuxt|webpack|tsconfig)\.config\.[jt]sx?$/, score: 70 },
  { re: /^(Dockerfile|docker-compose\.(yml|yaml))$/, score: 65 },
  { re: /^\.env\.example$/, score: 65 },
  { re: /\.(md|mdx)$/, score: 30 },
];

const PROFILE_RULES = {
  frontend: [
    { re: /(^|\/)(pages|app)\/.+\.[jt]sx?$/, score: 85 },   // 페이지 라우트
    { re: /(^|\/)components\/.+\.[jt]sx?$/, score: 75 },     // UI 컴포넌트
    { re: /(^|\/)hooks\/.+\.[jt]sx?$/, score: 65 },          // 커스텀 훅
    { re: /(^|\/)api\/.+\.[jt]sx?$/, score: 80 },            // API 라우트
    { re: /(^|\/)store(s)?\/.+\.[jt]sx?$/, score: 60 },      // 상태 관리
    { re: /(^|\/)lib\/.+\.[jt]sx?$/, score: 55 },
    { re: /(^|\/)utils?\/.+\.[jt]sx?$/, score: 45 },
  ],
  api: [
    { re: /(^|\/)(routes?|router)\/.+/, score: 80 },          // 라우팅
    { re: /(^|\/)(controllers?|handlers?)\/.+/, score: 80 },  // 컨트롤러
    { re: /(^|\/)services?\/.+/, score: 75 },                 // 비즈니스 로직
    { re: /(^|\/)middleware(s?)?\/.+/, score: 65 },
    { re: /(^|\/)(models?|entities|schemas?)\/.+/, score: 65 },
    { re: /(^|\/)(repositories?|dao)\/.+/, score: 60 },
    { re: /(^|\/)(logic|core|domain)\/.+/, score: 60 },
    { re: /(^|\/)utils?\/.+/, score: 45 },
  ],
  cli: [
    { re: /(^|\/)(cmd|commands?)\/.+/, score: 80 },
    { re: /(^|\/)(flags?|options?|args?)\/.+/, score: 70 },
    { re: /(^|\/)(core|internal)\/.+/, score: 65 },
    { re: /^bin\/.+/, score: 90 },
    { re: /(^|\/)utils?\/.+/, score: 45 },
  ],
  unknown: [],
};

const KEY_FILENAME_RULES = [
  // 파일명 자체가 실행 진입점/핵심 계층임을 나타내는 경우
  { re: /^(package\.json|pyproject\.toml|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|go\.mod)$/, score: 75 },
  { re: /^(main|app|index|server)\.(js|jsx|ts|tsx|mjs|cjs|py|go|rs)$/, score: 55 },
  { re: /^.*Application\.java$/, score: 60 },
  { re: /^(page|layout|template|loading|error|route)\.(js|jsx|ts|tsx)$/, score: 48 },
  { re: /(^|[._-])(routes?|controllers?|services?|handlers?|middlewares?|providers?|modules?)([._-]|$)/i, score: 58 },
  { re: /(^|[._-])(config|settings|bootstrap|startup|kernel)([._-]|$)/i, score: 32 },
];

const KEY_PATH_RULES = [
  // 경로 구조가 프레임워크 라우팅/서버 계층을 드러내는 경우
  { re: /(^|\/)(app|pages)\/.*(page|layout|route)\.[jt]sx?$/, score: 50 },
  { re: /(^|\/)(app|pages|views|screens)\//, score: 36 },
  { re: /(^|\/)api\//, score: 34 },
  { re: /(^|\/)(routes?|router)\//, score: 40 },
  { re: /(^|\/)(controllers?|handlers?)\//, score: 42 },
  { re: /(^|\/)services?\//, score: 36 },
  { re: /(^|\/)middleware(s?)?\//, score: 32 },
  { re: /(^|\/)(models?|entities|schemas?)\//, score: 24 },
  { re: /(^|\/)(repositories?|dao)\//, score: 24 },
  { re: /(^|\/)(logic|core|domain)\//, score: 28 },
  { re: /(^|\/)src\/main\//, score: 38 },
  { re: /(^|\/)(cmd|commands?|bin)\//, score: 36 },
  { re: /(^|\/)(lib|shared|config)\//, score: 20 },
];

const FRAMEWORK_ENTRY_RULES = [
  // 프레임워크별 관례적 entrypoint는 깊은 경로라도 우선한다.
  { re: /(^|\/)(app|pages)\/.*(page|layout)\.[jt]sx?$/, score: 45 },
  { re: /(^|\/)(server|app|index)\.(js|ts|mjs|cjs)$/, score: 42 },
  { re: /(^|\/).*Application\.java$/, score: 48 },
  { re: /(^|\/)main\.go$/, score: 45 },
  { re: /(^|\/)src\/main\.rs$/, score: 45 },
];

const FILE_CONTENT_RULES = [
  // import/annotation/bootstrap 코드로 실제 런타임 핵심 파일을 보정한다.
  { re: /from ['"]react['"]|import React|from ['"]next\//, score: 26 },
  { re: /export default function|export default async function/, score: 12 },
  { re: /express\s*\(|require\(['"]express['"]\)|from ['"]express['"]/, score: 35 },
  { re: /fastify\s*\(|from ['"]fastify['"]/, score: 35 },
  { re: /NestFactory\.create|from ['"]@nestjs\//, score: 42 },
  { re: /new Hono\s*\(|from ['"]hono['"]/, score: 28 },
  { re: /FastAPI\s*\(|from fastapi import/i, score: 42 },
  { re: /Flask\s*\(|from flask import/i, score: 32 },
  { re: /@SpringBootApplication|SpringApplication\.run/, score: 48 },
  { re: /@RestController|@Controller|@RequestMapping|@GetMapping|@PostMapping/, score: 36 },
  { re: /\b(class|function|const)\s+\w*(Controller|Service|Handler|Route)\b/, score: 22 },
  { re: /gin\.Default\(\)|gin\.New\(\)/, score: 38 },
  { re: /echo\.New\(\)/, score: 34 },
  { re: /axum::Router|Router::new\(\)/, score: 38 },
  { re: /tokio::main|actix_web::main/, score: 28 },
  { re: /commander|yargs|cobra\.Command|clap::Parser|argparse\.ArgumentParser/, score: 28 },
];

const LOW_PRIORITY_PATH_RULES = [
  // 예제/문서/테스트 파일은 핵심 코드처럼 보여도 선순위에서 밀어낸다.
  { re: /(^|\/)(examples?|bench(marks?)?|playground|demo|demos|samples?)\//, penalty: 120 },
  { re: /(^|\/)docs?\//, penalty: 80 },
  { re: /(^|\/)(tests?|__tests__|spec|mocks?|fixtures?)\//, penalty: 150 },
  { re: /\.(test|spec|stories)\.[jt]sx?$/, penalty: 150 },
  { re: /(^|\/)(README|CHANGELOG|LICENSE|CONTRIBUTING)\.md$/i, penalty: 35 },
];

function importBoost(importInfo = {}) {
  // 여러 파일에서 참조되는 파일일수록 핵심 로직/공유 모듈일 가능성이 높다.
  const {
    importCount = 0,
    importerCount = importCount,
    importDepth = 0,
  } = importInfo;

  if (importerCount >= 8) return 52;
  if (importerCount >= 5) return 42;
  if (importerCount >= 3) return 32;
  if (importerCount === 2) return 22;
  if (importerCount === 1) return importDepth >= 3 ? 18 : 12;

  // 한 파일에서 반복적으로 참조되는 경우도 약한 신호로 반영한다.
  if (importCount >= 3) return 10;
  return 0;
}

function depthPenalty(depth, isImportant) {
  // 핵심 파일은 monorepo/deep folder 구조에서도 depth 감점을 최소화한다.
  if (depth <= 1) return 0;
  return isImportant
    ? Math.min(Math.max(depth - 2, 0), 4)
    : Math.min(depth * 2, 14);
}

function calcScore(filePath, profile, content = '', importInfo = {}) {
  const normalized = filePath.replace(/\\/g, '/');
  const filename   = normalized.split('/').pop();
  const depth      = normalized.split('/').length - 1;
  const {
    importCount = 0,
    importerCount = importCount,
  } = importInfo;

  let score = 20;
  let importance = 0;

  // 기존 absolute priority 규칙은 유지하고, 이후 세부 신호를 더한다.
  for (const rule of COMMON_RULES) {
    if (rule.re.test(filename) || rule.re.test(normalized)) {
      score = Math.max(score, rule.score);
      importance += Math.ceil(rule.score / 25);
    }
  }
  for (const rule of (PROFILE_RULES[profile] || [])) {
    if (rule.re.test(normalized)) {
      score = Math.max(score, rule.score);
      importance += Math.ceil(rule.score / 30);
    }
  }

  for (const rule of KEY_FILENAME_RULES) {
    if (rule.re.test(filename)) {
      score += rule.score;
      importance += 2;
    }
  }

  for (const rule of KEY_PATH_RULES) {
    if (rule.re.test(normalized)) {
      score += rule.score;
      importance += 1;
    }
  }

  for (const rule of FRAMEWORK_ENTRY_RULES) {
    if (rule.re.test(normalized)) {
      score += rule.score;
      importance += 2;
    }
  }

  const sample = (content || '').slice(0, 8_000);
  for (const rule of FILE_CONTENT_RULES) {
    if (rule.re.test(sample)) {
      score += rule.score;
      importance += 2;
    }
  }

  const importScore = importBoost({ ...importInfo, importDepth: depth });
  score += importScore;
  if (importerCount >= 3) importance += 3;
  else if (importerCount > 0) importance += 2;
  else if (importCount > 0) importance += 1;

  for (const rule of LOW_PRIORITY_PATH_RULES) {
    if (rule.re.test(normalized)) {
      score -= rule.penalty;
      importance = Math.max(0, importance - 2);
    }
  }

  score -= depthPenalty(depth, importance >= 3);
  return Math.max(0, score);
}

// detectProfile — score 기반 heuristic

/**
 * 경로 신호 점수표
 * 각 항목: { re: RegExp, frontend: n, api: n, cli: n }
 */
const PROFILE_SIGNALS = [
  { re: /(^|\/)(pages|views|screens)\//, frontend: 3 },
  { re: /(^|\/)app\//, frontend: 2 },
  { re: /(^|\/)components\//, frontend: 3 },
  { re: /(^|\/)hooks\//, frontend: 2 },
  { re: /(^|\/)router\//, frontend: 1 },

  { re: /(^|\/)routes?\//, frontend: 1, api: 2 },
  { re: /(^|\/)(controllers?|handlers?)\//, api: 3 },
  { re: /(^|\/)middleware(s?)?\//, api: 2 },
  { re: /(^|\/)services?\//, frontend: 1, api: 2 },
  { re: /(^|\/)(repositories?|dao)\//, api: 2 },
  { re: /(^|\/)(domain|core)\//, api: 1, cli: 1 },

  { re: /(^|\/)(cmd|commands?)\//, cli: 3 },
  { re: /(^|\/)bin\//, cli: 2 },
  { re: /(^|\/)(flags?|options?|args?)\//, cli: 2 },
  { re: /(^|\/)internal\//, api: 1, cli: 1 },

  { re: /(^|\/)(next|vite|nuxt)\.config\.[jt]sx?$/, frontend: 4 },
  { re: /(^|\/)tailwind\.config\.[jt]s$/, frontend: 2 },
  { re: /(^|\/)(svelte\.config|astro\.config)\./, frontend: 3 },
];

/**
 * content 신호 점수표
 * 파일 내용 일부에서 프레임워크 키워드 감지
 */
const CONTENT_SIGNALS = [
  // frontend
  { kw: /from ['"]react['"]/,                        frontend: 3 },
  { kw: /from ['"]next\//,                           frontend: 3 },
  { kw: /from ['"]vue['"]/,                          frontend: 3 },
  { kw: /from ['"]svelte['"]/,                       frontend: 3 },
  { kw: /from ['"]nuxt\//,                           frontend: 2 },
  { kw: /@angular\/core/,                            frontend: 3 },
  // api (Node)
  { kw: /require\(['"]express['"]\)|from ['"]express['"]/, api: 3 },
  { kw: /from ['"]fastify['"]/,                      api: 3 },
  { kw: /from ['"]@nestjs\//,                        api: 3 },
  { kw: /from ['"]hono['"]/,                         api: 2 },
  // api (Python)
  { kw: /from fastapi/i,                             api: 4 },
  { kw: /import django/i,                            api: 3 },
  { kw: /from flask/i,                               api: 3 },
  // api (JVM)
  { kw: /@SpringBootApplication/,                    api: 4 },
  { kw: /@RestController/,                           api: 3 },
  // api (Go)
  { kw: /gin\.Default\(\)|gin\.New\(\)/,             api: 3 },
  { kw: /echo\.New\(\)/,                             api: 3 },
  // cli
  { kw: /commander|yargs|meow|cac/,                  cli: 3 },
  { kw: /cobra\.Command|pflag/,                      cli: 3 },
  { kw: /clap::Parser|clap::Command/,                cli: 3 },
  { kw: /click\.group|click\.command/,               cli: 3 },
  { kw: /argparse\.ArgumentParser/,                  cli: 2 },
];

/**
 * package.json dependency 신호
 */
const DEP_SIGNALS = {
  frontend: ['react', 'next', 'vue', 'nuxt', 'svelte', '@angular/core', 'solid-js', 'astro', 'remix', '@remix-run/react'],
  api:      ['express', 'fastify', '@nestjs/core', 'koa', 'hono', '@hapi/hapi'],
  cli:      ['commander', 'yargs', 'meow', 'cac', 'oclif', 'ink'],
};

/**
 * @param {string[]} paths
 * @param {Map<string,string>} fileMap
 * @returns {Profile}
 */
function detectProfile(paths, fileMap) {
  const scores = { frontend: 0, api: 0, cli: 0 };

  // ── 1) 경로 신호 ─────────────────────────────
  const joined = paths.join('\n');
  for (const sig of PROFILE_SIGNALS) {
    if (sig.re.test(joined)) {
      if (sig.frontend) scores.frontend += sig.frontend;
      if (sig.api)      scores.api      += sig.api;
      if (sig.cli)      scores.cli      += sig.cli;
    }
  }

  // ── 2) content 신호 (핵심 파일 일부만 검사) ──
  const CONTENT_CHECK_RE = /(package\.json|main\.(py|go|rs|ts|js)|app\.(py|ts|js)|server\.(ts|js)|Application\.java|index\.(ts|js))$/;
  for (const [path, content] of fileMap) {
    if (!CONTENT_CHECK_RE.test(path)) continue;
    const sample = (content || '').slice(0, 4000); // 앞 4000자만 검사
    for (const sig of CONTENT_SIGNALS) {
      if (sig.kw.test(sample)) {
        if (sig.frontend) scores.frontend += sig.frontend;
        if (sig.api)      scores.api      += sig.api;
        if (sig.cli)      scores.cli      += sig.cli;
      }
    }
  }

  // ── 3) package.json dependency 신호 ──────────
  const pkgContent = fileMap.get('package.json') || [...fileMap.entries()].find(([p]) => p.endsWith('/package.json'))?.[1] || '';
  if (pkgContent) {
    try {
      const pkg  = JSON.parse(pkgContent);
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      for (const [profile, pkgs] of Object.entries(DEP_SIGNALS)) {
        for (const dep of pkgs) {
          if (deps.some(d => d === dep || d.startsWith(dep + '/'))) {
            scores[profile] += 4;
          }
        }
      }
    } catch { /* JSON 파싱 실패 무시 */ }
  }

  // ── 4) 최고 score 선택 ───────────────────────
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return (best[1] > 0) ? best[0] : 'unknown';
}

// monorepo 감지

const ROOT_SIGNAL_FILES = new Map([
  ['package.json', 40],
  ['pyproject.toml', 40],
  ['pom.xml', 40],
  ['build.gradle', 38],
  ['build.gradle.kts', 38],
  ['Cargo.toml', 40],
  ['go.mod', 40],
  ['requirements.txt', 28],
  ['tsconfig.json', 16],
  ['nest-cli.json', 22],
]);

const ROOT_SIGNAL_PATTERNS = [
  { re: /(^|\/)(next|vite)\.config\.[cm]?[jt]sx?$/, score: 24 },
];

const STRUCTURAL_ROOT_RE = /^(apps|packages|services|crates|modules|libs|examples)\/([^/]+)/;

const ROOT_TYPE_SIGNALS = {
  frontend: [
    { re: /(^|\/)(page|layout)\.(js|jsx|ts|tsx)$/, score: 18 },
    { re: /(^|\/)(next|vite)\.config\.[cm]?[jt]sx?$/, score: 20 },
    { re: /from ['"]react['"]|import React|from ['"]next\//, score: 14, content: true },
  ],
  backend: [
    { re: /(^|\/)(controllers?|handlers?|routes?)\//i, score: 18 },
    { re: /(^|\/)services?\//i, score: 14 },
    { re: /(controller|service|handler|route)\.(js|jsx|ts|tsx|java|kt|py|go|rs)$/i, score: 16 },
    { re: /(^|\/).*Application\.java$/, score: 18 },
    { re: /express\s*\(|from ['"]express['"]|require\(['"]express['"]\)|fastify\s*\(|from ['"]fastify['"]|NestFactory\.create|@SpringBootApplication|FastAPI\s*\(|from fastapi import/i, score: 20, content: true },
  ],
  cli: [
    { re: /(^|\/)(cmd|commands?|bin)\//, score: 18 },
    { re: /(^|\/)main\.(go|rs)$/, score: 16 },
    { re: /argparse\.ArgumentParser|commander|yargs|cobra\.Command|clap::Parser/, score: 18, content: true },
  ],
  library: [
    { re: /(^|\/)src\/index\.(js|jsx|ts|tsx|mjs|cjs)$/, score: 18 },
    { re: /(^|\/)(lib|shared|packages?)\//, score: 12 },
    { re: /"exports"\s*:|"main"\s*:|"types"\s*:/, score: 16, content: true },
    { re: /export\s+\{|\bexport\s+(function|class|const|interface|type)\b/, score: 10, content: true },
  ],
};

/**
 * @typedef {Object} SubProject
 * @property {string}  root      - 하위 프로젝트 루트 경로 (예: "apps/web")
 * @property {string}  manifest  - manifest 파일명
 * @property {number}  depth     - 루트 깊이 (낮을수록 우선)
 * @property {boolean} isRoot    - 저장소 루트 여부
 * @property {number}  score
 * @property {string}  projectType
 * @property {number}  confidence
 */

/**
 * 파일 경로 목록에서 monorepo 구조를 감지하고 하위 프로젝트 목록 반환
 *
 * @param {string[]} paths
 * @param {Map<string,string>|Record<string,string>} [files]
 * @returns {{ isMonorepo: boolean, subProjects: SubProject[], primaryRoot: string, selectedRoots: string[], candidates: SubProject[] }}
 */
export function detectMonorepo(paths, files = new Map()) {
  const fileMap = files instanceof Map ? files : new Map(Object.entries(files));
  const normalizedPaths = paths.map(p => p.replace(/\\/g, '/'));
  const candidateMap = new Map();

  const ensureCandidate = (root) => {
    const normalized = root || '.';
    if (!candidateMap.has(normalized)) {
      candidateMap.set(normalized, {
        root: normalized,
        manifest: null,
        depth: normalized === '.' ? 0 : normalized.split('/').length,
        isRoot: normalized === '.',
        baseScore: 0,
        typeScores: { frontend: 0, backend: 0, cli: 0, library: 0 },
        signalCount: 0,
      });
    }
    return candidateMap.get(normalized);
  };

  const nearestCandidateRoot = (filePath) => {
    const matches = [...candidateMap.keys()]
      .filter(root => root === '.' || filePath === root || filePath.startsWith(root + '/'))
      .sort((a, b) => b.length - a.length);
    return matches[0] || inferStructuralRoot(filePath);
  };

  const addTypeSignal = (root, type, score) => {
    const candidate = ensureCandidate(root);
    candidate.typeScores[type] += score;
    candidate.signalCount += 1;
  };

  // 1) 실제 root marker 파일을 기반으로 후보를 만든다.
  for (const filePath of normalizedPaths) {
    const filename = filePath.split('/').pop();
    const root = dirname(filePath) || '.';

    if (ROOT_SIGNAL_FILES.has(filename)) {
      const candidate = ensureCandidate(root);
      candidate.baseScore += ROOT_SIGNAL_FILES.get(filename);
      candidate.manifest ||= filename;
      candidate.signalCount += 1;
    }

    for (const rule of ROOT_SIGNAL_PATTERNS) {
      if (rule.re.test(filePath)) {
        const candidate = ensureCandidate(root);
        candidate.baseScore += rule.score;
        candidate.manifest ||= filename;
        candidate.signalCount += 1;
      }
    }

    const structuralRoot = inferStructuralRoot(filePath);
    if (structuralRoot !== '.' && structuralRoot !== root) {
      ensureCandidate(structuralRoot);
    }
  }

  // 2) root 후보 주변의 파일명/경로/내용 신호를 균형 있게 더한다.
  for (const filePath of normalizedPaths) {
    const root = nearestCandidateRoot(filePath);
    const content = String(fileMap.get(filePath) || '').slice(0, 8_000);

    for (const [type, rules] of Object.entries(ROOT_TYPE_SIGNALS)) {
      for (const rule of rules) {
        if (rule.content) {
          if (content && rule.re.test(content)) addTypeSignal(root, type, rule.score);
        } else if (rule.re.test(filePath)) {
          addTypeSignal(root, type, rule.score);
        }
      }
    }
  }

  const candidates = [...candidateMap.values()]
    .map(candidate => {
      const typeEntries = Object.entries(candidate.typeScores)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const [projectType, typeScore] = typeEntries[0];
      const secondScore = typeEntries[1]?.[1] || 0;
      const score = candidate.baseScore + typeScore + Math.floor(secondScore * 0.25);
      const confidence = score > 0
        ? Number(Math.min(0.99, (typeScore + candidate.baseScore) / (score + 24)).toFixed(2))
        : 0;

      return {
        root: candidate.root,
        manifest: candidate.manifest,
        depth: candidate.depth,
        isRoot: candidate.isRoot,
        score,
        projectType: typeScore > 0 ? projectType : 'unknown',
        confidence,
      };
    })
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.depth - b.depth || a.root.localeCompare(b.root));

  const topScore = candidates[0]?.score || 0;
  const selectedRoots = candidates
    .filter(candidate => candidate.score >= Math.max(topScore - 28, topScore * 0.77))
    .slice(0, 3)
    .map(candidate => candidate.root);

  const primaryRoot = candidates[0]?.root || '.';
  const isMonorepo = candidates.some(p => !p.isRoot) && candidates.length > 1;

  return {
    isMonorepo,
    subProjects: candidates,
    primaryRoot,
    selectedRoots: selectedRoots.length ? selectedRoots : [primaryRoot],
    candidates,
  };
}

function inferStructuralRoot(filePath) {
  const match = filePath.match(STRUCTURAL_ROOT_RE);
  return match ? `${match[1]}/${match[2]}` : '.';
}

// import graph 기반 중요도

const IMPORT_RE = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const RESOLVE_EXTS = [
  '', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.java', '.json',
];

function dirname(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '' : path.slice(0, idx);
}

function normalizeRelativePath(path) {
  const parts = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function resolveImportPath(importerPath, specifier, pathSet) {
  if (!specifier.startsWith('.')) return null;

  
  const baseDir = dirname(importerPath);
  const base = normalizeRelativePath(`${baseDir}/${specifier}`);
  const candidates = [];

  for (const ext of RESOLVE_EXTS) {
    candidates.push(base + ext);
  }
  for (const ext of RESOLVE_EXTS.filter(Boolean)) {
    candidates.push(`${base}/index${ext}`);
  }
  candidates.push(`${base}/mod.rs`, `${base}/__init__.py`);

  return candidates.find(candidate => pathSet.has(candidate)) || null;
}

function buildImportGraph(fileMap) {
  // 각 파일이 repo 내부에서 몇 번, 어떤 파일들에 의해 import/re-export 되는지 계산한다.
  const paths = [...fileMap.keys()].map(path => path.replace(/\\/g, '/'));
  const pathSet = new Set(paths);
  const imports = new Map(paths.map(path => [path, new Set()]));
  const importedBy = new Map(paths.map(path => [path, new Set()]));
  const counts = new Map(paths.map(path => [path, 0]));

  for (const [rawPath, content] of fileMap) {
    const importerPath = rawPath.replace(/\\/g, '/');
    const text = String(content || '').slice(0, 20_000);
    IMPORT_RE.lastIndex = 0;

    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1] || match[2];
      const resolved = resolveImportPath(importerPath, specifier, pathSet);
      if (!resolved || resolved === importerPath) continue;
      imports.get(importerPath)?.add(resolved);
      importedBy.get(resolved)?.add(importerPath);
      counts.set(resolved, (counts.get(resolved) || 0) + 1);
    }
  }

  return {
    getInfo(path) {
      const normalized = path.replace(/\\/g, '/');
      const importers = [...(importedBy.get(normalized) || [])].sort();
      const dependencies = [...(imports.get(normalized) || [])].sort();

      return {
        importCount: counts.get(normalized) || 0,
        importerCount: importers.length,
        importedBy: importers,
        imports: dependencies,
      };
    },
  };
}

// selectFilesForLLM

/**
 * @typedef {Object} ScoredFile
 * @property {string}  path
 * @property {string}  content
 * @property {number}  score
 * @property {Profile} profile
 * @property {number}  importCount
 * @property {number}  importerCount
 * @property {string[]} importedBy
 */

/**
 * 프롬프트에 넣을 파일을 선별·순위화하여 반환
 *
 * @param {Map<string,string>|Record<string,string>} files  { path: content }
 * @param {{ maxFiles?: number, maxTotalTokens?: number, profile?: Profile }} options
 * @returns {{ files: ScoredFile[], profile: Profile, totalTokens: number, monorepo: object }}
 */
export function selectFilesForLLM(files, options = {}) {
  const {
    maxFiles       = 30,
    maxTotalTokens = 24_000,
  } = options;

  const fileMap  = files instanceof Map ? files : new Map(Object.entries(files));
  const allPaths = [...fileMap.keys()];

  // monorepo 감지 → ranking 기반으로 하나 이상의 대표 root를 선택한다.
  const monorepo = detectMonorepo(allPaths, fileMap);
  const selectedRoots = monorepo.selectedRoots || [monorepo.primaryRoot || '.'];

  const isSelectableScope = (p) => {
    // monorepo 아니면 전체 허용
    if (selectedRoots.includes('.')) return true;

    // 선택된 root 내부 파일과 루트 메타 파일만 선택 후보로 둔다.
    const isSelectedProject = selectedRoots.some(root => p.startsWith(root + '/'));

    const isRootFile = !p.includes('/');

    return isSelectedProject || isRootFile;
  };

  const profileEntries = selectedRoots.includes('.')
    ? [...fileMap.entries()]
    : [...fileMap.entries()].filter(([p]) => selectedRoots.some(root => p.startsWith(root + '/')));
  const profileFileMap = new Map(profileEntries.length ? profileEntries : [...fileMap.entries()].filter(([p]) => isSelectableScope(p)));
  const profilePaths = [...profileFileMap.keys()];

  // content도 넘겨서 정확한 profile 감지
  const profile = options.profile || detectProfile(profilePaths, profileFileMap);

  const candidates = allPaths
    .filter(p => isSelectableScope(p))
    .filter(p => passExtFilter(p))
    .filter(p => passBlacklist(p));

  const importGraph = buildImportGraph(fileMap);

  const scored = candidates.map(path => {
    const importInfo = importGraph.getInfo(path);
    return {
      path,
      content: fileMap.get(path),
      score:   calcScore(path, profile, fileMap.get(path), importInfo),
      profile,
      importCount: importInfo.importCount,
      importerCount: importInfo.importerCount,
      importedBy: importInfo.importedBy,
    };
  }).sort((a, b) => b.score - a.score || b.importerCount - a.importerCount || a.path.localeCompare(b.path));

  const estimateTokens = (text, path = '') =>
    Math.ceil((truncateForContext(text).length + path.length + 16) / 4);
  let totalTokens = 0;
  const selected  = [];

  for (const f of scored) {
    if (selected.length >= maxFiles) break;
    const tokens = estimateTokens(f.content, f.path);
    if (totalTokens + tokens > maxTotalTokens) continue;
    selected.push(f);
    totalTokens += tokens;
  }

  return { files: selected, profile, totalTokens, monorepo };
}

/**
 * selectFilesForLLM 결과를 Qwen 프롬프트 컨텍스트 문자열로 직렬화
 * @param {{ files: ScoredFile[], profile: Profile }} result
 * @returns {string}
 */
export function buildLLMContext(result) {
  const blocks = result.files.map(f => {
    const ext = f.path.split('.').pop() || '';
    const content = truncateForContext(f.content);
    const fence = markdownFenceFor(content);

    return `### ${f.path}\n${fence}${ext}\n${content}\n${fence}`;
  });
  return [
    `Project profile: ${result.profile}`,
    `Selected ${result.files.length} files for analysis:`,
    '',
    ...blocks,
  ].join('\n');
}

// README 모델 입력 생성

function parsePackageMetadata(files) {
  const fileMap = files instanceof Map ? files : new Map(Object.entries(files));
  const packageJson =
    fileMap.get('package.json')
    || [...fileMap.entries()].find(([path]) => path.endsWith('/package.json'))?.[1];

  if (!packageJson) return {};

  try {
    const pkg = JSON.parse(packageJson);
    return {
      name: typeof pkg.name === 'string' ? pkg.name : undefined,
      description: typeof pkg.description === 'string' ? pkg.description : undefined,
    };
  } catch {
    return {};
  }
}

/**
 * README 생성 모델에 넘길 핵심 파일 목록을 반환한다.
 *
 * selectFiles()와 별도 기준을 만들지 않고 selectFilesForLLM()의 결과를 사용해서
 * 모델 입력과 LLM 파일 선별 결과가 어긋나지 않게 한다.
 *
 * @param {Map<string,string>|Record<string,string>} files
 * @param {{ maxFiles?: number, maxTotalTokens?: number, profile?: Profile }} options
 * @returns {Array<{ path: string, content: string }>}
 */
export function buildSelectedFileContents(files, options = {}) {
  const result = selectFilesForLLM(files, options);
  return result.files.map(({ path, content }) => ({ path, content }));
}

/**
 * HuggingFace README 생성 모델이 바로 사용할 수 있는 입력 객체를 만든다.
 *
 * @param {Map<string,string>|Record<string,string>} files
 * @param {{ name?: string|null, description?: string|null }} [metadata]
 * @param {{ maxFiles?: number, maxTotalTokens?: number, profile?: Profile }} [options]
 * @returns {{ name: string, description: string, selectedFileContents: Array<{ path: string, content: string }> }}
 */
export function buildReadmeModelInput(files, metadata = {}, options = {}) {
  const safeMetadata = metadata || {};
  const packageMetadata = parsePackageMetadata(files);

  return {
    name: safeMetadata.name ?? packageMetadata.name ?? '',
    description: safeMetadata.description ?? packageMetadata.description ?? '',
    selectedFileContents: buildSelectedFileContents(files, options),
  };
}


// selectFiles — README 생성용 대표 파일 선별 (API 유지)

export function selectFiles(files) {
  const fileMap = files instanceof Map
    ? files
    : new Map(Object.entries(files));

  const selected = {
    packageConfig  : pickFirst(fileMap, FILE_PRIORITY_RULES.packageConfig, 'config'),
    lockFile       : pickFirst(fileMap, FILE_PRIORITY_RULES.lockFile,      'config'),
    envExample     : pickFirst(fileMap, FILE_PRIORITY_RULES.envExample,    'config'),
    dockerfile     : pickFirst(fileMap, FILE_PRIORITY_RULES.dockerfile,    'config'),
    ciConfig       : pickFirst(fileMap, FILE_PRIORITY_RULES.ciConfig,      'ci'),
    makeFile       : pickFirst(fileMap, FILE_PRIORITY_RULES.makeFile,      'config'),
    entryPoints    : pickEntryPoints(fileMap),
    requirementsTxt: pickRequirementsTxt(fileMap),
  };

  const packageManager = detectPackageManager(fileMap);
  return { selected, packageManager };
}

// summarizeSelected (API 유지)

export function summarizeSelected(selected) {
  const lines = ['[파일 선별 결과]'];
  const fields = ['packageConfig', 'lockFile', 'envExample', 'dockerfile', 'ciConfig', 'makeFile'];
  for (const field of fields) {
    const f = selected[field];
    lines.push(`  ${field.padEnd(16)}: ${f ? f.path : '(없음)'}`);
  }
  lines.push(`  ${'entryPoints'.padEnd(16)}: ${selected.entryPoints.map(f => f.path).join(', ') || '(없음)'}`);
  return lines.join('\n');
}
