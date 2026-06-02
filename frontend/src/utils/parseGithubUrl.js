const INVALID_GITHUB_URL_MESSAGE = '올바른 GitHub 저장소 URL을 입력해주세요.'

// GitHub 저장소 URL에서 owner와 repo 이름 추출
export function parseGithubUrl(url) {
  // 문자열이 아니거나 값이 없으면 URL로 처리할 수 없으면 에러 발생시킴
  if (!url || typeof url !== 'string') {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  // 사용자가 앞뒤 공백을 함께 입력해도 정상 처리되도록 함
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  const sshUrlMatch = trimmedUrl.match(
    /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/
  )

  if (sshUrlMatch) {
    return {
      owner: sshUrlMatch[1],
      repo: sshUrlMatch[2],
    }
  }

  // github.com으로 바로 시작하는 경우 URL 객체가 해석할 수 있도록 https:// 처리
  const normalizedUrl = trimmedUrl.startsWith('github.com/')
    ? `https://${trimmedUrl}`
    : trimmedUrl

  let parsedUrl

  try {
    // URL 객체를 사용해 hostname과 pathname을 분리
    parsedUrl = new URL(normalizedUrl)
  } catch {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  // GitHub 저장소 URL만 허용
  if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  // /owner/repo 형태에서 owner와 repo만 추출하고 '/' 는 제거
  const [owner, rawRepo] = parsedUrl.pathname
    .split('/')
    .filter(Boolean)
  const repo = rawRepo?.replace(/\.git$/, '')

  // owner/repo가 부족하면 에러 발생 시킴
  if (!owner || !repo) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  return {
    owner,
    repo,
  }
}
