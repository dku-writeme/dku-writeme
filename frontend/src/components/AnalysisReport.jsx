import { useState } from 'react'
import { CheckIcon, SparkleIcon } from './Icons.jsx'

const STATUS_LABELS = {
  success: 'AI 분석 완료',
  timeout: 'AI 시간 초과',
  failed: 'Fallback 사용',
  fallback: 'Rule-based 분석',
}

const STATUS_DESCRIPTIONS = {
  success: 'AI 응답과 저장소 규칙 분석을 함께 반영했습니다.',
  timeout: 'AI 서버 응답이 늦어 규칙 기반 분석으로 생성했습니다.',
  failed: 'AI 분석을 사용할 수 없어 규칙 기반 분석으로 생성했습니다.',
  fallback: '저장소 구조와 핵심 파일 기준으로 생성했습니다.',
}

const formatDuration = (durationMs) => {
  if (!Number.isFinite(durationMs)) {
    return '-'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  return `${(durationMs / 1000).toFixed(1)}s`
}

const compactList = (items = [], limit = 6) =>
  Array.from(new Set(items
    .map((item) => String(item || '').trim())
    .filter(Boolean)))
    .slice(0, limit)

function AnalysisReport({ report }) {
  const [filesExpanded, setFilesExpanded] = useState(false)

  if (!report) {
    return (
      <section className="analysis-report analysis-report-empty" aria-label="AI analysis report">
        <header className="analysis-report-header">
          <div className="analysis-status-icon" aria-hidden="true">
            <SparkleIcon />
          </div>
          <div>
            <p className="eyebrow">AI ANALYSIS</p>
            <h2>분석 대기</h2>
          </div>
        </header>
        <p className="analysis-message">저장소를 생성하면 분석 파일, 감지 항목, fallback 여부가 표시됩니다.</p>
      </section>
    )
  }

  const status = report.status || 'fallback'
  const detectedItems = report.detectedItems || {}
  const tagItems = compactList([
    detectedItems.projectType,
    detectedItems.primaryLanguage,
    ...(detectedItems.techStack || []),
    ...(detectedItems.buildTools || []),
    detectedItems.hasExistingReadme ? '기존 README' : null,
  ])
  const features = compactList(
    (detectedItems.features || []).flatMap((feature) =>
      String(feature || '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^-+\s*/, '').trim())
    ),
    5
  )
  const allAnalyzedFiles = report.analyzedFiles || []
  const visibleFileLimit = filesExpanded ? allAnalyzedFiles.length : 4
  const analyzedFiles = allAnalyzedFiles.slice(0, visibleFileLimit)
  const hasHiddenFiles = allAnalyzedFiles.length > visibleFileLimit

  return (
    <section className={`analysis-report analysis-report-${status}`} aria-label="AI analysis report">
      <header className="analysis-report-header">
        <div className="analysis-status-icon" aria-hidden="true">
          {status === 'success' ? <CheckIcon /> : <SparkleIcon />}
        </div>
        <div>
          <p className="eyebrow">AI ANALYSIS</p>
          <h2>{STATUS_LABELS[status] || STATUS_LABELS.fallback}</h2>
        </div>
        <span className="analysis-status-pill">
          {report.fallbackUsed ? 'Fallback' : 'AI'}
        </span>
      </header>

      <p className="analysis-message">
        {report.message || STATUS_DESCRIPTIONS[status] || STATUS_DESCRIPTIONS.fallback}
      </p>

      <dl className="analysis-metrics">
        <div>
          <dt>분석 파일</dt>
          <dd>
            {report.analyzedFileCount}/{report.selectedFileCount}
          </dd>
        </div>
        <div>
          <dt>전체 파일</dt>
          <dd>{report.totalFileCount}</dd>
        </div>
        <div>
          <dt>소요 시간</dt>
          <dd>{formatDuration(report.durationMs)}</dd>
        </div>
        <div>
          <dt>토큰 추정</dt>
          <dd>{report.totalTokens || 0}</dd>
        </div>
      </dl>

      <div className="analysis-detected">
        <div>
          <h3>감지 항목</h3>
          <div className="analysis-tags">
            {tagItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        {features.length > 0 && (
          <div>
            <h3>AI가 감지한 주요 기능</h3>
            <ul className="analysis-evidence">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="analysis-files">
        <div className="analysis-files-heading">
          <div>
            <h3>AI에 전달된 파일</h3>
            <p>
              총 {allAnalyzedFiles.length}개 중 {analyzedFiles.length}개 표시
            </p>
          </div>
          {allAnalyzedFiles.length > 4 && (
            <button
              type="button"
              onClick={() => setFilesExpanded((isExpanded) => !isExpanded)}
            >
              {filesExpanded ? '접기' : '더보기'}
            </button>
          )}
        </div>
        <ul>
          {analyzedFiles.map((file) => (
            <li key={file.path}>
              <code>{file.path}</code>
              <span>{file.reason || file.profile || '핵심 파일'}</span>
            </li>
          ))}
        </ul>
        {hasHiddenFiles && (
          <p className="analysis-files-note">
            나머지 {allAnalyzedFiles.length - visibleFileLimit}개 파일도 분석에 사용되었습니다.
          </p>
        )}
      </div>
    </section>
  )
}

export default AnalysisReport
