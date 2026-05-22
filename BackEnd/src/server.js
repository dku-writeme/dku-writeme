import http from 'node:http'
import { deliverFileContents, deliverFileTree, deliverInfo } from './lib/deliverInfo.js'
import { organizeReadmeData } from './lib/organizeReadmeData.js'
import { selectImportantFiles } from './lib/selectImportantFiles.js'
import dotenv from 'dotenv'
dotenv.config()

// 서버가 실행될 주소와 포트를 환경변수로 변경할 수 있도록 구성
const HOST = process.env.HOST || '127.0.0.1'
const PORT = process.env.PORT || 3000

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

  const repoInfo = await deliverInfo(owner, repo)

  if (!repoInfo) {
    sendJson(response, 404, {
      message: 'GitHub 저장소 정보를 가져오지 못했습니다.',
    })
    return
  }

  const files = await deliverFileTree(owner, repo, repoInfo.defaultBranch)
  const selectedFiles = selectImportantFiles(files)
  const selectedFileContents = await deliverFileContents(
    owner,
    repo,
    repoInfo.defaultBranch,
    selectedFiles
  )
  
  // AI 서버 호출
  let description = repoInfo.description
  let features = null

  try {
    const aiResponse = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoInfo.name,
        description: repoInfo.description,
        selectedFileContents: selectedFileContents.map(f => ({
          path: f.path,
          content: f.content
        }))
      })
    })

    if (aiResponse.ok) {
      const aiResult = await aiResponse.json()
      description = aiResult.description
      features = aiResult.features
    }
  } catch (error) {
    console.error('AI 서버 호출 실패:', error.message)
  }

  // 선별된 핵심 파일의 실제 내용을 조회
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

  // README 생성에 바로 활용할 수 있도록 저장소 정보와 핵심 파일 분석 정보를 정리
  const readmeData = organizeReadmeData(repoInfo, files, selectedFiles, selectedFileContents)

  // 정상 조회된 저장소 정보, 파일 목록, 핵심 파일 내용, README 생성용 데이터를 반환
  sendJson(response, 200, {
    ...repoInfo,
    description,
    features,
    files,
    selectedFiles,
    selectedFileContents,
    readmeData,
  })
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

  // 등록되지 않은 API 경로에 대한 404 에러 처리
  sendJson(response, 404, { message: '요청한 API를 찾을 수 없습니다.' })
})

// 지정한 host와 port로 API 서버 실행
server.listen(PORT, HOST, () => {
  console.log(`API server is running at http://${HOST}:${PORT}`)
})
