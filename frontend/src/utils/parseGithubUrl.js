const INVALID_GITHUB_URL_MESSAGE = '올바른 GitHub 저장소 URL을 입력해주세요.'

export function parseGithubUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  const normalizedUrl = trimmedUrl.startsWith('github.com/')
    ? `https://${trimmedUrl}`
    : trimmedUrl

  let parsedUrl

  try {
    parsedUrl = new URL(normalizedUrl)
  } catch {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  if (parsedUrl.hostname !== 'github.com') {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  const [owner, repo, ...rest] = parsedUrl.pathname
    .split('/')
    .filter(Boolean)

  if (!owner || !repo || rest.length > 0) {
    throw new Error(INVALID_GITHUB_URL_MESSAGE)
  }

  return {
    owner,
    repo,
  }
}
