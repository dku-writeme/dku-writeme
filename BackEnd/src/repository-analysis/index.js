// index.js
import {
  buildReadmeModelInput,
  selectFiles,
  summarizeSelected,
} from './src/repository-analysis/fileSelector.js';
import { detectProject }                  from './src/repository-analysis/projectDetector.js';
import { generateInstallation, generateRun, generateBuild } from './src/repository-analysis/generators.js';
import { fetchRepositoryFiles }           from './src/repository-analysis/githubFetcher.js';

// ═══════════════════════════════════════════
// 파이프라인 
// ═══════════════════════════════════════════

/**
 * @param {Record<string, string>} repoFiles  { '파일경로': '파일내용' }
 * @param {{ verbose?: boolean }} [options]
 * @returns {import('./src/schema.js').GeneratedReadme}
 */
export function generateReadmeSections(repoFiles, options = {}) {
  const { verbose = false } = options;
  const allFilePaths = Object.keys(repoFiles);

  const { selected, packageManager } = selectFiles(repoFiles);
  if (verbose) console.log(summarizeSelected(selected));

  const project = detectProject(selected, packageManager, allFilePaths);
  if (verbose) {
    console.log(`[프로젝트 감지] type=${project.type} | lang=${project.language} | pm=${project.packageManager}`);
    console.log(`  frameworks: ${project.frameworks.join(', ') || '(없음)'}`);
    console.log(`  runtimes  : ${project.runtimes.join(', ')}`);
    console.log(`  envVars   : ${Object.keys(project.envVars).join(', ') || '(없음)'}`);
  }

  const installation = generateInstallation(project);
  const run          = generateRun(project);
  const build        = generateBuild(project);

  return { installation, run, build, meta: project };
}

/**
 * HuggingFace README 생성 모델 입력을 만든다.
 *
 * @param {Record<string, string>} repoFiles  { '파일경로': '파일내용' }
 * @param {{ name?: string|null, description?: string|null }} [metadata]
 * @param {{ maxFiles?: number, maxTotalTokens?: number, profile?: import('./src/repository-analysis/fileSelector.js').Profile }} [options]
 * @returns {{ name: string, description: string, selectedFileContents: Array<{ path: string, content: string }> }}
 */
export function generateReadmeModelInput(repoFiles, metadata = {}, options = {}) {
  return buildReadmeModelInput(repoFiles, metadata, options);
}

/**
 * @param {import('./src/schema.js').GeneratedReadme} readme
 * @returns {string}
 */
export function renderMarkdown(readme) {
  return [
    readme.installation.title,
    readme.installation.content,
    readme.run.title,
    readme.run.content,
    readme.build.title,
    readme.build.content,
  ].join('\n\n');
}

// ═══════════════════════════════════════════
// 실행 — GitHub 실제 저장소 분석
// ═══════════════════════════════════════════

// CLI: node index.js [owner] [repo]
// 예:  node index.js vercel next.js
//      node index.js tiangolo fastapi
const [,, ownerArg, repoArg] = process.argv;

const TARGETS = [
  { owner: ownerArg || 'vercel', repo: repoArg || 'next.js' },
];

async function main() {
  for (const { owner, repo } of TARGETS) {
    console.log('═'.repeat(60));
    console.log(`📦 ${owner}/${repo}`);
    console.log('═'.repeat(60));

    try {
      const repoFiles = await fetchRepositoryFiles(owner, repo, {
        token:    process.env.GITHUB_TOKEN,
        maxFiles: 40,
      });

      const readme = generateReadmeSections(repoFiles, { verbose: true });

      console.log('\n' + '─'.repeat(60));
      console.log(renderMarkdown(readme));
      console.log('─'.repeat(60));
      console.log(`✅ type=${readme.meta.type} | frameworks=[${readme.meta.frameworks.join(', ')}]`);

    } catch (err) {
      console.error(`❌ ${owner}/${repo} 실패: ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
    }
  }
}

main();
