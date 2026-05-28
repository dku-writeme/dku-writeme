// repository-analysis/index.js
import {
  buildReadmeModelInput,
  selectFiles,
  summarizeSelected,
} from './fileSelector.js'

function parsePackageScripts(selected) {
  const packageFile = selected.packageConfig?.path?.endsWith('package.json')
    ? selected.packageConfig
    : null

  if (!packageFile) return {}

  try {
    const packageJson = JSON.parse(packageFile.content)
    return packageJson.scripts || {}
  } catch {
    return {}
  }
}

function scriptCommand(packageManager, scriptName) {
  if (!scriptName) return null
  if (packageManager === 'yarn') return `yarn ${scriptName}`
  if (packageManager === 'pnpm') return `pnpm ${scriptName}`
  return scriptName === 'start' ? 'npm start' : `npm run ${scriptName}`
}

function detectInstallCommand(packageManager, selected) {
  if (packageManager === 'yarn') return 'yarn install'
  if (packageManager === 'pnpm') return 'pnpm install'
  if (packageManager === 'npm') return 'npm install'
  if (packageManager === 'poetry') return 'poetry install'
  if (packageManager === 'pipenv') return 'pipenv install'
  if (selected.requirementsTxt) return 'pip install -r requirements.txt'
  if (packageManager === 'cargo') return 'cargo build'
  if (packageManager === 'go modules') return 'go mod download'
  if (packageManager === 'maven') return 'mvn install'
  if (packageManager === 'gradle') return './gradlew build'
  if (packageManager === 'bundler') return 'bundle install'
  return 'No install command detected.'
}

function detectRunCommand(packageManager, scripts) {
  const scriptName = ['dev', 'start', 'serve'].find((name) => scripts[name])
  const command = scriptCommand(packageManager, scriptName)
  if (command) return command
  if (packageManager === 'cargo') return 'cargo run'
  if (packageManager === 'go modules') return 'go run .'
  return 'No run command detected.'
}

function detectBuildCommand(packageManager, scripts) {
  const command = scriptCommand(packageManager, scripts.build ? 'build' : null)
  if (command) return command
  if (packageManager === 'cargo') return 'cargo build'
  if (packageManager === 'go modules') return 'go build ./...'
  if (packageManager === 'maven') return 'mvn package'
  if (packageManager === 'gradle') return './gradlew build'
  return 'No build command detected.'
}

function codeBlock(command) {
  if (command.startsWith('No ')) return command
  return `\`\`\`bash\n${command}\n\`\`\``
}

/**
 * @param {Record<string, string>} repoFiles { '파일경로': '파일내용' }
 * @param {{ verbose?: boolean }} [options]
 */
export function generateReadmeSections(repoFiles, options = {}) {
  const { verbose = false } = options
  const { selected, packageManager } = selectFiles(repoFiles)
  const scripts = parsePackageScripts(selected)

  if (verbose) console.log(summarizeSelected(selected))

  const installation = detectInstallCommand(packageManager, selected)
  const run = detectRunCommand(packageManager, scripts)
  const build = detectBuildCommand(packageManager, scripts)

  return {
    installation: {
      title: '## Installation',
      content: codeBlock(installation),
    },
    run: {
      title: '## Usage',
      content: codeBlock(run),
    },
    build: {
      title: '## Build',
      content: codeBlock(build),
    },
    meta: {
      packageManager,
      selected,
    },
  }
}

/**
 * HuggingFace README 생성 모델 입력을 만든다.
 *
 * @param {Record<string, string>} repoFiles { '파일경로': '파일내용' }
 * @param {{ name?: string|null, description?: string|null }} [metadata]
 * @param {{ maxFiles?: number, maxTotalTokens?: number, profile?: import('./fileSelector.js').Profile }} [options]
 */
export function generateReadmeModelInput(repoFiles, metadata = {}, options = {}) {
  return buildReadmeModelInput(repoFiles, metadata, options)
}

export function renderMarkdown(readme) {
  return [
    readme.installation.title,
    readme.installation.content,
    readme.run.title,
    readme.run.content,
    readme.build.title,
    readme.build.content,
  ].join('\n\n')
}
