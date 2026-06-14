import { useEffect, useRef, useState } from 'react'
import UrlInput from './components/UrlInput.jsx'
import MarkdownEditor from './components/MarkdownEditor.jsx'
import MarkdownPreview from './components/MarkdownPreview.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import ReadmeOptions from './components/ReadmeOptions.jsx'
import AnalysisReport from './components/AnalysisReport.jsx'
import GenerationProgress from './components/GenerationProgress.jsx'
import { requestReadmeStream } from './api/repoApi.js'
import { parseGithubUrl } from './utils/parseGithubUrl.js'
import './App.css'

const DEFAULT_SECTIONS = {
  overview: true,
  features: true,
  techStack: true,
  projectStructure: true,
  importantFiles: true,
  scripts: true,
  license: true,
  link: true,
}

function App() {
  // README 생성에 필요한 입력값과 화면 상태를 App에서 한 번에 관리
  // abortControllerRef는 새 요청이 시작될 때 이전 스트리밍 요청을 중단하는 용도
  const abortControllerRef = useRef(null)
  // requestIdRef는 느리게 도착한 이전 요청 결과가 최신 화면을 덮어쓰지 못하게 막음
  const requestIdRef = useRef(0)
  const scrollSyncRef = useRef(false)
  // 에디터/미리보기 실제 스크롤 DOM을 받아 동기화 이벤트 연결에 사용
  const [editorScrollElement, setEditorScrollElement] = useState(null)
  const [previewScrollElement, setPreviewScrollElement] = useState(null)
  const [url, setUrl] = useState('')
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [markdown, setMarkdown] = useState('')
  const [analysisReport, setAnalysisReport] = useState(null)
  const [generationEvents, setGenerationEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true)
  const selectedSectionCount = Object.values(sections).filter(Boolean).length
  const totalSectionCount = Object.keys(DEFAULT_SECTIONS).length
  const markdownLineCount = markdown ? markdown.split('\n').length : 0
  const generationActive = loading || typing

  useEffect(() => {
    if (!scrollSyncEnabled || !editorScrollElement || !previewScrollElement) {
      return undefined
    }

    // 양쪽 스크롤 이벤트가 서로를 다시 호출하지 않도록 동기화 중 상태 관리
    const syncScrollPosition = (sourceElement, targetElement) => {
      if (scrollSyncRef.current) {
        return
      }

      const sourceScrollableHeight = sourceElement.scrollHeight - sourceElement.clientHeight
      const targetScrollableHeight = targetElement.scrollHeight - targetElement.clientHeight

      if (sourceScrollableHeight <= 0 || targetScrollableHeight <= 0) {
        return
      }

      scrollSyncRef.current = true
      targetElement.scrollTop =
        (sourceElement.scrollTop / sourceScrollableHeight) * targetScrollableHeight

      window.requestAnimationFrame(() => {
        scrollSyncRef.current = false
      })
    }

    const handleEditorScroll = () => {
      syncScrollPosition(editorScrollElement, previewScrollElement)
    }
    const handlePreviewScroll = () => {
      syncScrollPosition(previewScrollElement, editorScrollElement)
    }

    editorScrollElement.addEventListener('scroll', handleEditorScroll, { passive: true })
    previewScrollElement.addEventListener('scroll', handlePreviewScroll, { passive: true })

    return () => {
      editorScrollElement.removeEventListener('scroll', handleEditorScroll)
      previewScrollElement.removeEventListener('scroll', handlePreviewScroll)
    }
  }, [editorScrollElement, previewScrollElement, scrollSyncEnabled])

  // 사용자가 README에 포함할 섹션을 켜고 끌 때 기존 선택 상태를 보존하면서 한 항목만 변경
  const handleSectionToggle = (sectionKey) => {
    setSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }))
  }

  // 백엔드 스트리밍 이벤트와 프론트의 타이핑 이벤트를 같은 진행 목록에 누적
  const addGenerationEvent = (event) => {
    setGenerationEvents((currentEvents) => [...currentEvents, event])
  }

  // 생성된 전체 markdown을 작은 조각으로 나누어 화면에 작성되는 느낌을 제공
  const typeMarkdown = async (fullMarkdown, requestId, signal) => {
    setTyping(true)
    setMarkdown('')
    addGenerationEvent({
      type: 'progress',
      step: 'typing',
      status: 'active',
      message: 'README를 실시간으로 작성하는 중입니다.',
      timestamp: new Date().toISOString(),
    })

    const chunkSize = 10
    const delayMs = 8

    for (let index = 0; index < fullMarkdown.length; index += chunkSize) {
      // 요청이 취소되었거나 더 최신 요청이 시작된 경우 현재 타이핑 루프를 즉시 중단
      if (signal.aborted || requestIdRef.current !== requestId) {
        throw new DOMException('README 생성이 취소되었습니다.', 'AbortError')
      }

      const nextMarkdown = fullMarkdown.slice(0, index + chunkSize)
      setMarkdown(nextMarkdown)
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs)
      })
    }

    setMarkdown(fullMarkdown)
    addGenerationEvent({
      type: 'progress',
      step: 'typing',
      status: 'complete',
      message: 'README 문서 작성이 완료되었습니다.',
      timestamp: new Date().toISOString(),
    })
    setTyping(false)
  }

  // URL 검증 -> owner/repo 파싱 -> README 생성 API 호출 순서로 실행
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!url.trim()) {
      alert('GitHub 저장소 URL을 입력해주세요.')
      return
    }

    // 새 생성 요청을 시작하기 전에 진행 중이던 요청과 타이핑 애니메이션을 정리
    abortControllerRef.current?.abort()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLoading(true)
    setTyping(false)
    setMarkdown('')
    setAnalysisReport(null)
    setGenerationEvents([])

    try {
      const { owner, repo } = parseGithubUrl(url)
      const response = await requestReadmeStream(
        owner,
        repo,
        {
          sections,
        },
        {
          onEvent: (event) => {
            // 오래된 요청에서 뒤늦게 도착한 progress 이벤트는 화면에 반영하지 않음
            if (requestIdRef.current === requestId) {
              addGenerationEvent(event)
            }
          },
        },
        abortController.signal
      )

      // 스트리밍 완료 직후에도 최신 요청 여부를 다시 확인해 경쟁 상태를 방지
      if (requestIdRef.current !== requestId) {
        return
      }

      setAnalysisReport(response.repo.analysisReport)
      await typeMarkdown(response.markdown, requestId, abortController.signal)
    } catch (error) {
      if (error.name !== 'AbortError') {
        addGenerationEvent({
          type: 'error',
          step: 'error',
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        })
        alert(error.message)
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false)
        setTyping(false)
      }
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <div>
            <p className="eyebrow">README BUILDER</p>
            <h1>WRITEME.md</h1>
            <p>GitHub 저장소 URL을 입력하고 완성도 있는 README 초안을 생성해보세요.</p>
          </div>
        </div>
        <dl className="header-stats" aria-label="README state summary">
          <div>
            <dt>선택 섹션</dt>
            <dd>
              {selectedSectionCount}/{totalSectionCount}
            </dd>
          </div>
          <div>
            <dt>문서 줄 수</dt>
            <dd>{markdownLineCount}</dd>
          </div>
        </dl>
      </header>

      <section className="workspace-shell" aria-label="README generator workspace">
        <aside className="control-rail" aria-label="README controls">
          <section className="rail-section">
            <div className="section-heading">
              <span className="step-badge">01</span>
              <div>
                <h2>저장소</h2>
                <p>Repository source</p>
              </div>
            </div>
            <UrlInput
              url={url}
              onChange={(event) => setUrl(event.target.value)}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </section>

          <ReadmeOptions
            sections={sections}
            selectedCount={selectedSectionCount}
            totalCount={totalSectionCount}
            onSectionToggle={handleSectionToggle}
          />
        </aside>

        <section className="workspace-main" aria-label="Markdown workspace">
          <div className="workspace-toolbar">
            <div>
              <p className="eyebrow">LIVE README</p>
              <h2>편집 및 미리보기</h2>
            </div>
            <div className="workspace-actions">
              <label className="scroll-sync-toggle">
                <input
                  type="checkbox"
                  checked={scrollSyncEnabled}
                  onChange={(event) => setScrollSyncEnabled(event.target.checked)}
                />
                <span aria-hidden="true" />
                <strong>스크롤 동기화</strong>
              </label>
              <ActionButtons markdown={markdown} disabled={generationActive} />
            </div>
          </div>

          <GenerationProgress events={generationEvents} active={generationActive} />
          <AnalysisReport report={analysisReport} />

          <section className="markdown-workspace">
            <MarkdownEditor
              markdown={markdown}
              lineCount={markdownLineCount}
              onChange={setMarkdown}
              onScrollElementReady={setEditorScrollElement}
            />
            <MarkdownPreview
              markdown={markdown}
              lineCount={markdownLineCount}
              onScrollElementReady={setPreviewScrollElement}
            />
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
