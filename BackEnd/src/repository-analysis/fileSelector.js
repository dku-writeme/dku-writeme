// fileSelector.js
import { FILE_PRIORITY_RULES } from './schema.js';

// ═══════════════════════════════════════════════════════
// glob / matchesAny / pickFirst 유틸 
// ═══════════════════════════════════════════════════════

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

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

// ═══════════════════════════════════════════════════════
// detectPackageManager
// - 반드시 manifest(package.json 등)가 있을 때만 해당 PM 반환
// - lock 파일 단독으로 PM을 결정하지 않음
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// 확장자 필터 
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// 블랙리스트
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// 가중치 scoring
// ═══════════════════════════════════════════════════════

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

function calcScore(filePath, profile) {
  const normalized = filePath.replace(/\\/g, '/');
  const filename   = normalized.split('/').pop();
  const depth      = normalized.split('/').length - 1;

  let score = 20;
  for (const rule of COMMON_RULES) {
    if (rule.re.test(filename) || rule.re.test(normalized)) {
      score = Math.max(score, rule.score);
    }
  }
  for (const rule of (PROFILE_RULES[profile] || [])) {
    if (rule.re.test(normalized)) {
      score = Math.max(score, rule.score);
    }
  }
  score -= Math.min(depth * 3, 15);
  return Math.max(0, score);
}

// ═══════════════════════════════════════════════════════
// detectProfile — score 기반 heuristic
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// monorepo 감지
// ═══════════════════════════════════════════════════════

/**
 * monorepo 하위 프로젝트 루트 디렉토리 패턴
 */
const MONOREPO_ROOT_PATTERNS = [
  /^(apps|packages|services|crates|server|client|frontend|backend)\/([^/]+)\//,
];

const MANIFEST_FILES = new Set([
  'package.json', 'pyproject.toml', 'Cargo.toml',
  'go.mod', 'pom.xml', 'build.gradle', 'build.gradle.kts',
]);

/**
 * @typedef {Object} SubProject
 * @property {string}  root      - 하위 프로젝트 루트 경로 (예: "apps/web")
 * @property {string}  manifest  - manifest 파일명
 * @property {number}  depth     - 루트 깊이 (낮을수록 우선)
 * @property {boolean} isRoot    - 저장소 루트 여부
 */

/**
 * 파일 경로 목록에서 monorepo 구조를 감지하고 하위 프로젝트 목록 반환
 *
 * @param {string[]} paths
 * @returns {{ isMonorepo: boolean, subProjects: SubProject[], primaryRoot: string }}
 */
export function detectMonorepo(paths) {
  const subProjectMap = new Map(); // root → SubProject

  // 루트 manifest 확인
  const rootManifests = [...MANIFEST_FILES].filter(m => paths.includes(m));
  if (rootManifests.length > 0) {
    subProjectMap.set('.', {
      root:     '.',
      manifest: rootManifests[0],
      depth:    0,
      isRoot:   true,
    });
  }

  // monorepo 하위 경로 탐색
  for (const filePath of paths) {
    const filename = filePath.split('/').pop();
    if (!MANIFEST_FILES.has(filename)) continue;

    for (const pattern of MONOREPO_ROOT_PATTERNS) {
      const m = filePath.match(pattern);
      if (m) {
        const root = `${m[1]}/${m[2]}`;
        if (!subProjectMap.has(root)) {
          subProjectMap.set(root, {
            root,
            manifest: filename,
            depth:    root.split('/').length,
            isRoot:   false,
          });
        }
        break;
      }
    }
  }

  const subProjects = [...subProjectMap.values()]
    .sort((a, b) => a.depth - b.depth);

  const isMonorepo = subProjects.some(p => !p.isRoot) && subProjects.length > 1;

  // primaryRoot 우선순위:
  //   1) 루트에 manifest 있으면 루트 우선
  //   2) apps/web > apps/api > packages/* 순
  //   3) depth 낮은 것 우선
  const priority = (sp) => {
    if (sp.isRoot) return 0;
    if (/^apps\/(web|frontend|client)/.test(sp.root)) return 1;
    if (/^apps\/(api|backend|server)/.test(sp.root)) return 2;
    return sp.depth + 10;
  };
  const primaryRoot = subProjects.sort((a, b) => priority(a) - priority(b))[0]?.root || '.';

  return { isMonorepo, subProjects, primaryRoot };
}

// ═══════════════════════════════════════════════════════
// selectFilesForLLM
// ═══════════════════════════════════════════════════════

/**
 * @typedef {Object} ScoredFile
 * @property {string}  path
 * @property {string}  content
 * @property {number}  score
 * @property {Profile} profile
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

  // monorepo 감지 → primaryRoot 기반 필터 옵션
  const monorepo = detectMonorepo(allPaths);

  // content도 넘겨서 정확한 profile 감지
  const profile = options.profile || detectProfile(allPaths, fileMap);

 const candidates = allPaths
  .filter(p => {
    // monorepo 아니면 전체 허용
    if (monorepo.primaryRoot === '.') return true;

    // primaryRoot 내부 파일 허용
    const isPrimaryProject =
      p.startsWith(monorepo.primaryRoot + '/');

    // 루트 파일(package.json, README.md 등) 허용
    const isRootFile = !p.includes('/');

    return isPrimaryProject || isRootFile;
  })
  .filter(p => passExtFilter(p))
  .filter(p => passBlacklist(p));

  const scored = candidates.map(path => ({
    path,
    content: fileMap.get(path),
    score:   calcScore(path, profile),
    profile,
  })).sort((a, b) => b.score - a.score);

  const estimateTokens = text => Math.ceil((text || '').length / 4);
  let totalTokens = 0;
  const selected  = [];

  for (const f of scored) {
    if (selected.length >= maxFiles) break;
    const tokens = estimateTokens(f.content);
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
  const MAX_FILE_CHARS = 8_000;
  const blocks = result.files.map(f => {
    const ext = f.path.split('.').pop() || '';

    const content =
      (f.content || '').length > MAX_FILE_CHARS
        ? f.content.slice(0, MAX_FILE_CHARS) +
          '\n// [TRUNCATED]'
        : f.content;

    return `### ${f.path}\n\`\`\`${ext}\n${content}\n\`\`\``;
});
  return [
    `Project profile: ${result.profile}`,
    `Selected ${result.files.length} files for analysis:`,
    '',
    ...blocks,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════
// README 모델 입력 생성
// ═══════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════
// selectFiles — README 생성용 대표 파일 선별 (API 유지)
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// summarizeSelected (API 유지)
// ═══════════════════════════════════════════════════════

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