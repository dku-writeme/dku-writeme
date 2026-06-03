const STEP_LABELS = {
  start: '생성 시작',
  'repo-info': '저장소 확인',
  'file-tree': '파일 트리 분석',
  'file-select': '핵심 파일 선별',
  'file-content': '파일 내용 조회',
  'ai-analysis': '저장소 분석',
  organize: '데이터 정리',
  typing: 'README 작성',
  complete: '완료',
}

const DEFAULT_STEPS = [
  'repo-info',
  'file-tree',
  'file-select',
  'file-content',
  'ai-analysis',
  'organize',
  'typing',
]

function GenerationProgress({ events = [], active }) {
  if (!active) {
    return null
  }

  const latestByStep = events.reduce((stepMap, event) => {
    stepMap[event.step] = event
    return stepMap
  }, {})
  const latestEvent = events[events.length - 1]
  const currentStep = latestEvent?.step || 'start'
  const completedStepCount = DEFAULT_STEPS.filter((step) =>
    latestByStep[step]?.status === 'complete' || latestByStep[step]?.status === 'warning'
  ).length
  const progressPercent = Math.round((completedStepCount / DEFAULT_STEPS.length) * 100)
  const progressLabel = `${completedStepCount}/${DEFAULT_STEPS.length}`

  return (
    <section className="generation-progress" aria-label="README generation progress">
      <div className="generation-progress-main">
        <span className="generation-progress-spinner" aria-hidden="true" />
        <div className="generation-progress-copy">
          <strong>{STEP_LABELS[currentStep] || 'README 생성'}</strong>
          <span>{latestEvent?.message || 'README 생성 작업을 준비하는 중입니다.'}</span>
        </div>
        <span className="generation-progress-percent">{progressLabel}</span>
      </div>
      <div className="generation-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.max(progressPercent, 8)}%` }} />
      </div>
    </section>
  )
}

export default GenerationProgress
