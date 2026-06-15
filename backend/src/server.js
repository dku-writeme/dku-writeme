import http from 'node:http'
import {
  GithubApiError,
  deliverFileContents,
  deliverFileTree,
  deliverInfo,
} from './lib/deliverInfo.js'
import { organizeReadmeData } from './lib/organizeReadmeData.js'
import { selectImportantFiles } from './lib/selectImportantFiles.js'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: new URL('./.env', import.meta.url), override: false })

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// 서버가 실행될 주소와 포트를 환경변수로 변경할 수 있도록 구성
const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || 3000
const AI_ANALYSIS_URL = process.env.AI_ANALYSIS_URL || 'http://localhost:8000/analyze'
const AI_ANALYSIS_TIMEOUT_MS = parsePositiveInteger(
  process.env.AI_ANALYSIS_TIMEOUT_MS,
  60000
)
const AI_ANALYSIS_MAX_FILES = parsePositiveInteger(
  process.env.AI_ANALYSIS_MAX_FILES,
  20
)
const AI_ANALYSIS_MAX_FILE_CHARS = parsePositiveInteger(
  process.env.AI_ANALYSIS_MAX_FILE_CHARS,
  7000
)

// 프론트엔드 개발 서버에서 API 호출할 수 있도록 CORS 헤더 구성
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// 모든 API 응답을 JSON 형식으로 반환하도록 공통 응답 함수 구현
function sendJson(response, statusCode, data) {
  // 상태 코드, CORS, JSON Content-Type을 한 번에 설정함
  response.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8',
  })

  // 객체 데이터를 JSON 문자열로 변환해서 응답 종료 처리
  response.end(JSON.stringify(data))
}

function startStream(response) {
  response.writeHead(200, {
    ...corsHeaders,
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
}

function writeStreamEvent(response, event) {
  response.write(`${JSON.stringify(event)}\n`)
}

function createProgressEvent(step, status, message, detail = {}) {
  return {
    type: 'progress',
    step,
    status,
    message,
    detail,
    timestamp: new Date().toISOString(),
  }
}

// POST 요청 body를 읽어서 JSON 객체로 변환함
async function readJsonBody(request) {
  let body = ''

  // 요청 body는 chunk 단위로 들어오므로 하나의 문자열로 합침
  for await (const chunk of request) {
    body += chunk
  }

  // body가 없는 요청도 빈 객체로 처리해 이후 검증 단계에서 걸러지게 함
  if (!body) {
    return {}
  }

  try {
    // 문자열 body를 실제 JavaScript 객체로 파싱
    return JSON.parse(body)
  } catch {
    // JSON 형식이 깨진 경우 호출한 쪽에서 400 응답을 보낼 수 있게 에러 발생
    throw new Error('요청 본문이 올바른 JSON 형식이 아닙니다.')
  }
}

function normalizeAiFeatures(features) {
  // AI 응답 형태를 배열로 통일하고 유사 기능을 제거해 README 중복 출력 방지
  const normalizedFeatures = splitFeatureItems(features)
  const dedupedFeatures = dedupeFeatureItems(normalizedFeatures)

  return dedupedFeatures.length > 0 ? dedupedFeatures : null
}

function normalizeAiText(text) {
  const normalizedText = typeof text === 'string' ? text.trim() : ''

  return normalizedText && normalizedText !== 'None' ? normalizedText : null
}

function splitFeatureItems(features) {
  const featureItems = Array.isArray(features) ? features : [features]

  return featureItems
    .flatMap((feature) =>
      String(feature || '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^-+\s*/, '').trim())
    )
    .filter(Boolean)
}

function parseFeatureItem(feature) {
  // "기능명: 설명" 형태를 비교 가능한 제목/설명 구조로 분리
  const normalizedFeature = String(feature || '').replace(/^-+\s*/, '').trim()
  const separatorIndex = normalizedFeature.search(/[:：]/)

  if (separatorIndex === -1) {
    return {
      title: normalizedFeature,
      description: '',
      text: normalizedFeature,
    }
  }

  return {
    title: normalizedFeature.slice(0, separatorIndex).trim(),
    description: normalizedFeature.slice(separatorIndex + 1).trim(),
    text: normalizedFeature,
  }
}

function normalizeComparableText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const FEATURE_STOP_WORDS = new Set([
  '기능',
  '서비스',
  '시스템',
  '프로젝트',
  '사용자',
  '사용',
  '다양한',
  '유용한',
  '기반',
  '기반으로',
  '정보',
  '데이터',
  '제공',
  '지원',
  '처리',
])

function normalizeComparableToken(word) {
  return word
    .replace(/(합니다|드립니다|해보세요|제공합니다|생성합니다|지원합니다)$/u, '')
    .replace(/(하고|하거나|하며|하고요|하거나요)$/u, '')
    .replace(/(을|를|이|가|은|는|에|에서|에게|으로|로|와|과|의)$/u, '')
}

function tokenizeComparableText(text) {
  return normalizeComparableText(text)
    .split(' ')
    .map((word) => normalizeComparableToken(word))
    .filter((word) => word.length >= 2)
    .filter((word) => !FEATURE_STOP_WORDS.has(word))
}

function isTokenSubset(subsetTokens, supersetTokens) {
  return [...subsetTokens].every((token) => supersetTokens.has(token))
}

function hasSimilarFeatureContent(currentFeature, previousFeature) {
  // 제목/설명 완전 일치와 토큰 겹침을 함께 사용한 유사 기능 판정
  const currentTitle = normalizeComparableText(currentFeature.title)
  const previousTitle = normalizeComparableText(previousFeature.title)

  if (currentTitle && currentTitle === previousTitle) {
    return true
  }

  const currentDescription = normalizeComparableText(currentFeature.description)
  const previousDescription = normalizeComparableText(previousFeature.description)

  if (currentDescription && currentDescription === previousDescription) {
    return true
  }

  const currentTitleTokens = new Set(tokenizeComparableText(currentFeature.title))
  const previousTitleTokens = new Set(tokenizeComparableText(previousFeature.title))
  const currentTokens = new Set(
    tokenizeComparableText(`${currentFeature.title} ${currentFeature.description}`)
  )
  const previousTokens = new Set(
    tokenizeComparableText(`${previousFeature.title} ${previousFeature.description}`)
  )

  if (currentTokens.size === 0 || previousTokens.size === 0) {
    return false
  }

  if (
    currentTitleTokens.size >= 2
    && isTokenSubset(currentTitleTokens, previousTokens)
  ) {
    return true
  }

  if (
    previousTitleTokens.size >= 2
    && isTokenSubset(previousTitleTokens, currentTokens)
  ) {
    return true
  }

  const overlapCount = [...currentTokens].filter((token) => previousTokens.has(token)).length
  const containmentSimilarity = overlapCount / Math.min(currentTokens.size, previousTokens.size)
  const unionSize = new Set([...currentTokens, ...previousTokens]).size
  const jaccardSimilarity = overlapCount / unionSize

  return (
    overlapCount >= 2
    && (containmentSimilarity >= 0.75 || jaccardSimilarity >= 0.55)
  )
}

function dedupeFeatureItems(features) {
  const dedupedFeatures = []

  for (const feature of features) {
    const parsedFeature = parseFeatureItem(feature)
    const isDuplicate = dedupedFeatures.some((previousFeature) =>
      hasSimilarFeatureContent(parsedFeature, previousFeature)
    )

    if (!isDuplicate) {
      dedupedFeatures.push(parsedFeature)
    }
  }

  return dedupedFeatures.map((feature) => feature.text)
}

function createAiAnalysisReport(aiAnalysis, readmeData, selectedFileContents) {
  const analysis = readmeData.analysis || {}
  const repositoryAnalysis = readmeData.repositoryAnalysis || {}
  const rawDetectedFeatures = Array.isArray(aiAnalysis.features)
    ? aiAnalysis.features
    : aiAnalysis.features
      ? [aiAnalysis.features]
      : analysis.detectedFeatures || []
  const detectedFeatures = dedupeFeatureItems(splitFeatureItems(rawDetectedFeatures))
  const techStack = analysis.techStack || []
  const analyzedFiles = selectedFileContents.map((file) => {
    const selectionFile = repositoryAnalysis.files?.find(
      (selectedFile) => selectedFile.path === file.path
    )

    return {
      path: file.path,
      reason: file.reason,
      priority: file.priority,
      size: file.size,
      score: selectionFile?.score ?? null,
      profile: selectionFile?.profile || repositoryAnalysis.profile || null,
    }
  })

  return {
    status: aiAnalysis.status,
    usedAi: aiAnalysis.usedAi,
    fallbackUsed: aiAnalysis.fallbackUsed,
    message: aiAnalysis.message,
    summary: aiAnalysis.summary || null,
    durationMs: aiAnalysis.durationMs,
    analyzedFileCount: analyzedFiles.length,
    analyzedFiles,
    selectedFileCount: readmeData.fileSummary?.selectedCount || 0,
    totalFileCount: readmeData.fileSummary?.totalCount || 0,
    contentFileCount: readmeData.fileSummary?.contentCount || 0,
    repositoryProfile: analysis.repositoryProfile || null,
    monorepo: Boolean(analysis.monorepo?.isMonorepo),
    totalTokens: analysis.totalTokens || 0,
    detectedItems: {
      projectType: analysis.projectType || null,
      primaryLanguage: analysis.primaryLanguage || null,
      techStack,
      buildTools: analysis.buildTools || [],
      features: detectedFeatures,
      commands: analysis.commands || {},
      hasExistingReadme: Boolean(analysis.hasExistingReadme),
    },
  }
}

function githubErrorMessage(error) {
  if (error.status === 403) {
    const rateLimitRemaining = error.details?.rateLimitRemaining

    if (rateLimitRemaining === '0') {
      return 'GitHub API 요청 한도를 초과했습니다. GITHUB_TOKEN을 설정하거나 잠시 후 다시 시도해주세요.'
    }

    return 'GitHub 저장소 접근이 거부되었습니다. private 저장소이거나 GITHUB_TOKEN 권한이 부족할 수 있습니다.'
  }

  if (error.status === 404) {
    return 'GitHub 저장소를 찾을 수 없습니다. owner/repo 이름과 공개 여부를 확인해주세요.'
  }

  if (error.status === 409) {
    return 'GitHub 저장소가 비어 있거나 기본 브랜치 파일 트리를 가져올 수 없습니다.'
  }

  return `GitHub API 요청에 실패했습니다. (${error.status}) ${error.message}`
}

async function analyzeRepositoryWithAi(repoInfo, selectedFileContents) {
  let summary = normalizeAiText(repoInfo.description)
  let features = null
  const startedAt = Date.now()
  const fallbackMessage = 'AI 분석을 사용할 수 없어 Rule-based 분석 결과로 README를 구성했습니다.'
  let status = 'fallback'
  let message = fallbackMessage

  try {
    const aiResponse = await fetch(AI_ANALYSIS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(AI_ANALYSIS_TIMEOUT_MS),
      body: JSON.stringify({
        name: repoInfo.name,
        description: repoInfo.description,
        selectedFileContents: selectedFileContents.slice(0, AI_ANALYSIS_MAX_FILES).map((file) => ({
          path: file.path,
          content: String(file.content || '').slice(0, AI_ANALYSIS_MAX_FILE_CHARS),
          truncated: String(file.content || '').length > AI_ANALYSIS_MAX_FILE_CHARS,
        })),
      }),
    })

    if (aiResponse.ok) {
      const aiResult = await aiResponse.json()
      // description은 GitHub 원본 값을 유지하고, AI 요약은 README 상단 인용문에만 사용
      summary = normalizeAiText(aiResult.summary) || summary
      features = normalizeAiFeatures(aiResult.features)
      status = 'success'
      message = 'AI 분석이 완료되었습니다.'
    } else {
      console.error('AI 서버 응답 오류:', aiResponse.status)
      status = 'failed'
      message = `AI 서버가 ${aiResponse.status} 응답을 반환해 Rule-based 분석으로 대체했습니다.`
    }
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      console.error(`AI 서버 호출 시간 초과: ${AI_ANALYSIS_TIMEOUT_MS}ms`)
      status = 'timeout'
      message = `AI 서버 호출이 ${AI_ANALYSIS_TIMEOUT_MS}ms 안에 완료되지 않아 Rule-based 분석으로 대체했습니다.`
    } else {
      console.error('AI 서버 호출 실패:', error.message)
      status = 'failed'
      message = fallbackMessage
    }
  }

  return {
    summary,
    features,
    status,
    usedAi: status === 'success',
    fallbackUsed: status !== 'success',
    message,
    durationMs: Date.now() - startedAt,
  }
}

async function handleGenerate(request, response) {
  let payload

  try {
    payload = await readJsonBody(request)
  } catch (error) {
    sendJson(response, 400, { message: error.message })
    return
  }

  const owner = String(payload.owner || '').trim()
  const repo = String(payload.repo || '').trim()

  if (!owner || !repo) {
    sendJson(response, 400, {
      message: 'owner와 repo를 모두 입력해주세요.',
    })
    return
  }

  try {
    const generatedRepoInfo = await generateReadmePayload(owner, repo)
    sendJson(response, 200, generatedRepoInfo)
  } catch (error) {
    if (error instanceof GithubApiError) {
      console.error('GitHub API 오류:', error.status, error.message)
      sendJson(response, error.status, {
        message: githubErrorMessage(error),
        githubStatus: error.status,
        githubMessage: error.message,
      })
      return
    }

    console.error('README 생성 중 오류가 발생했습니다:', error)
    sendJson(response, 500, {
      message: 'README 생성 중 오류가 발생했습니다.',
    })
  }
}

async function generateReadmePayload(owner, repo, emitProgress = () => {}) {
  emitProgress(createProgressEvent(
    'repo-info',
    'active',
    'GitHub 저장소 기본 정보를 가져오는 중입니다.'
  ))
  const repoInfo = await deliverInfo(owner, repo)

  if (!repoInfo) {
    const error = new Error('GitHub 저장소 정보를 가져오지 못했습니다.')
    error.status = 404
    throw error
  }

  emitProgress(createProgressEvent(
    'repo-info',
    'complete',
    `${repoInfo.fullName} 저장소 정보를 확인했습니다.`,
    {
      fullName: repoInfo.fullName,
      defaultBranch: repoInfo.defaultBranch,
    }
  ))

  emitProgress(createProgressEvent(
    'file-tree',
    'active',
    '저장소 파일 트리를 분석하는 중입니다.'
  ))
  const files = await deliverFileTree(owner, repo, repoInfo.defaultBranch)
  emitProgress(createProgressEvent(
    'file-tree',
    'complete',
    `${files.length}개 파일 항목을 확인했습니다.`,
    { totalFileCount: files.length }
  ))

  emitProgress(createProgressEvent(
    'file-select',
    'active',
    'README 생성에 중요한 파일을 선별하는 중입니다.'
  ))
  const selectedFiles = selectImportantFiles(files)
  emitProgress(createProgressEvent(
    'file-select',
    'complete',
    `${selectedFiles.length}개 핵심 파일 후보를 선별했습니다.`,
    { selectedFileCount: selectedFiles.length }
  ))

  emitProgress(createProgressEvent(
    'file-content',
    'active',
    '핵심 파일 내용을 가져오는 중입니다.'
  ))
  const selectedFileContents = await deliverFileContents(
    owner,
    repo,
    repoInfo.defaultBranch,
    selectedFiles,
    {
      maxFiles: 30,
      maxContentSize: 100000,
    }
  )
  emitProgress(createProgressEvent(
    'file-content',
    'complete',
    `${selectedFileContents.length}개 파일 내용을 읽었습니다.`,
    { contentFileCount: selectedFileContents.length }
  ))

  emitProgress(createProgressEvent(
    'ai-analysis',
    'active',
    'AI가 저장소 특징을 분석하는 중입니다.'
  ))
  const aiAnalysis = await analyzeRepositoryWithAi(repoInfo, selectedFileContents)
  emitProgress(createProgressEvent(
    'ai-analysis',
    aiAnalysis.usedAi ? 'complete' : 'warning',
    aiAnalysis.message,
    {
      status: aiAnalysis.status,
      usedAi: aiAnalysis.usedAi,
      fallbackUsed: aiAnalysis.fallbackUsed,
      durationMs: aiAnalysis.durationMs,
    }
  ))

  const analyzedRepoInfo = {
    ...repoInfo,
    summary: aiAnalysis.summary,
    description: repoInfo.description,
  }

  emitProgress(createProgressEvent(
    'organize',
    'active',
    'README에 사용할 분석 데이터를 정리하는 중입니다.'
  ))
  const readmeData = organizeReadmeData(
    analyzedRepoInfo,
    files,
    selectedFiles,
    selectedFileContents
  )
  const analysisReport = createAiAnalysisReport(
    aiAnalysis,
    readmeData,
    selectedFileContents
  )
  emitProgress(createProgressEvent(
    'organize',
    'complete',
    'README 생성 데이터를 정리했습니다.',
    {
      totalTokens: analysisReport.totalTokens,
      analyzedFileCount: analysisReport.analyzedFileCount,
    }
  ))

  return {
    ...analyzedRepoInfo,
    features: aiAnalysis.features,
    files,
    selectedFiles,
    selectedFileContents,
    readmeData,
    analysisReport,
  }
}

async function handleGenerateStream(request, response) {
  let payload

  try {
    payload = await readJsonBody(request)
  } catch (error) {
    sendJson(response, 400, { message: error.message })
    return
  }

  const owner = String(payload.owner || '').trim()
  const repo = String(payload.repo || '').trim()

  if (!owner || !repo) {
    sendJson(response, 400, {
      message: 'owner와 repo를 모두 입력해주세요.',
    })
    return
  }

  startStream(response)

  try {
    writeStreamEvent(response, createProgressEvent(
      'start',
      'active',
      'README 생성 작업을 시작했습니다.',
      { owner, repo }
    ))

    const generatedRepoInfo = await generateReadmePayload(owner, repo, (event) => {
      writeStreamEvent(response, event)
    })

    writeStreamEvent(response, {
      type: 'complete',
      step: 'complete',
      status: 'complete',
      message: 'README 생성이 완료되었습니다.',
      repo: generatedRepoInfo,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof GithubApiError) {
      console.error('GitHub API 오류:', error.status, error.message)
      writeStreamEvent(response, {
        type: 'error',
        step: 'github',
        status: 'error',
        message: githubErrorMessage(error),
        githubStatus: error.status,
        githubMessage: error.message,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('README 스트리밍 생성 중 오류가 발생했습니다:', error)
      writeStreamEvent(response, {
        type: 'error',
        step: 'server',
        status: 'error',
        message: error.message || 'README 생성 중 오류가 발생했습니다.',
        timestamp: new Date().toISOString(),
      })
    }
  } finally {
    response.end()
  }
}

const server = http.createServer(async (request, response) => {
  // 요청 URL을 파싱해 method와 pathname 기준으로 라우팅
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    // CORS preflight 요청 처리
    response.writeHead(204, corsHeaders)
    response.end()
    return
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    // 서버 실행 여부를 확인하기 위한 상태 체크 API
    sendJson(response, 200, { status: 'ok' })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/generate') {
    // README 생성에 필요한 GitHub 저장소 정보 조회 API
    await handleGenerate(request, response)
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/generate/stream') {
    // README 생성 진행 상태를 실시간 이벤트로 반환하는 API
    await handleGenerateStream(request, response)
    return
  }

  // 등록되지 않은 API 경로에 대한 404 에러 처리
  sendJson(response, 404, { message: '요청한 API를 찾을 수 없습니다.' })
})

// 지정한 host와 port로 API 서버 실행
server.listen(PORT, HOST, () => {
  console.log(`API server is running at http://${HOST}:${PORT}`)
})
