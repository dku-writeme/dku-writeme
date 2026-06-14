import { useState } from 'react'
import { CheckIcon, SparkleIcon } from './Icons.jsx'

const STATUS_LABELS = {
  success: '분석 요약',
  timeout: '분석 시간 초과',
  failed: 'Fallback 사용',
  fallback: 'Rule-based 분석',
}

const STATUS_DESCRIPTIONS = {
  success: 'AI와 저장소 규칙 분석을 함께 반영했습니다.',
  timeout: 'AI 응답이 늦어 규칙 기반 분석으로 생성했습니다.',
  failed: 'AI 분석을 사용할 수 없어 규칙 기반 분석으로 생성했습니다.',
  fallback: '저장소 구조와 핵심 파일 기준으로 생성했습니다.',
}

// 백엔드에서 받은 ms 값을 UI에서 읽기 좋은 단위로 변환
const formatDuration = (durationMs) => {
  if (!Number.isFinite(durationMs)) {
    return '-'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  return `${(durationMs / 1000).toFixed(1)}s`
}

// 중복되거나 빈 분석 항목을 제거하고 화면이 과하게 길어지지 않도록 개수를 제한
const compactList = (items = [], limit = 6) =>
  Array.from(new Set(items
    .map((item) => String(item || '').trim())
    .filter(Boolean)))
    .slice(0, limit)

function AnalysisReport({ report }) {
  // 리포트 전체 상세 보기와 파일 목록 더보기는 서로 독립된 UI 상태로 관리
  const [filesExpanded, setFilesExpanded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  if (!report) {
    return null
  }

  const status = report.status || 'fallback'
  const detectedItems = report.detectedItems || {}
  // 프로젝트 타입, 언어, 기술 스택처럼 빠르게 훑을 수 있는 값은 tag 형태로 표시
  const tagItems = compactList([
    detectedItems.projectType,
    detectedItems.primaryLanguage,
    ...(detectedItems.techStack || []),
    ...(detectedItems.buildTools || []),
    detectedItems.hasExistingReadme ? '기존 README' : null,
  ])
  const allAnalyzedFiles = report.analyzedFiles || []
  // 기본 화면은 핵심 파일만 보여주고, 사용자가 필요할 때 전체 목록을 펼침
  const visibleFileLimit = filesExpanded ? allAnalyzedFiles.length : 4
  const analyzedFiles = allAnalyzedFiles.slice(0, visibleFileLimit)
  const hasHiddenFiles = allAnalyzedFiles.length > visibleFileLimit
  const summaryItems = [
    report.fallbackUsed ? 'Fallback 적용' : 'AI 반영',
    `${report.analyzedFileCount || 0}개 파일 분석`,
    `${formatDuration(report.durationMs)}`,
  ]

  return (
    <section
      className={`analysis-report analysis-report-${status} ${detailsOpen ? 'analysis-report-open' : 'analysis-report-compact'}`}
      aria-label="AI analysis report"
    >
      <header className="analysis-report-header">
        <div className="analysis-status-icon" aria-hidden="true">
          {status === 'success' ? <CheckIcon /> : <SparkleIcon />}
        </div>
        <div>
          <p className="eyebrow">ANALYSIS SUMMARY</p>
          <h2>{STATUS_LABELS[status] || STATUS_LABELS.fallback}</h2>
        </div>
        <div className="analysis-compact-actions">
          <span className="analysis-summary-text">{summaryItems.join(' · ')}</span>
          <button
            type="button"
            className="analysis-details-button"
            onClick={() => setDetailsOpen((isOpen) => !isOpen)}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? '접기' : '분석 보기'}
          </button>
        </div>
      </header>

      {detailsOpen && (
        <>
          <p className="analysis-message">
            {report.message || STATUS_DESCRIPTIONS[status] || STATUS_DESCRIPTIONS.fallback}
          </p>

          <div className="analysis-summary">
            <section className="analysis-flow" aria-label="analysis file flow">
              <h3>분석 범위</h3>
              <ol>
                <li>
                  <span>1</span>
                  <strong>{report.totalFileCount}개</strong>
                  <em>저장소 파일</em>
                  <small>GitHub 파일 트리</small>
                </li>
                <li>
                  <span>2</span>
                  <strong>{report.selectedFileCount}개</strong>
                  <em>후보 선별</em>
                  <small>중요 파일 후보</small>
                </li>
                <li>
                  <span>3</span>
                  <strong>{report.contentFileCount}개</strong>
                  <em>내용 조회</em>
                  <small>파일 내용 읽음</small>
                </li>
                <li className="analysis-flow-primary">
                  <span>4</span>
                  <strong>{report.analyzedFileCount}개</strong>
                  <em>AI 전달</em>
                  <small>최종 모델 입력</small>
                </li>
              </ol>
            </section>

            <dl className="analysis-metrics">
              <div>
                <dt>소요 시간</dt>
                <dd>{formatDuration(report.durationMs)}</dd>
              </div>
              <div>
                <dt>토큰 추정</dt>
                <dd>{report.totalTokens || 0}</dd>
              </div>
            </dl>
          </div>

          <div className="analysis-detected">
            <div>
              <h3>감지 항목</h3>
              <div className="analysis-tags">
                {tagItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="analysis-files">
            <div className="analysis-files-heading">
              <div>
                <h3>AI에 전달된 파일</h3>
                <p>
                  {allAnalyzedFiles.length}개 중 {analyzedFiles.length}개 표시
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
                나머지 {allAnalyzedFiles.length - visibleFileLimit}개 파일
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default AnalysisReport
