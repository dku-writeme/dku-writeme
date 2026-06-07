import { useRef, useState } from 'react'
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
  repositoryInfo: true,
  techStack: true,
  features: true,
  projectStructure: true,
  importantFiles: true,
  scripts: true,
  license: true,
}

function App() {
  // README 생성에 필요한 입력값과 화면 상태를 App에서 한 번에 관리
  const abortControllerRef = useRef(null)
  const requestIdRef = useRef(0)
  const [url, setUrl] = useState('')
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [markdown, setMarkdown] = useState('')
  const [analysisReport, setAnalysisReport] = useState(null)
  const [generationEvents, setGenerationEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [typing, setTyping] = useState(false)
  const selectedSectionCount = Object.values(sections).filter(Boolean).length
  const totalSectionCount = Object.keys(DEFAULT_SECTIONS).length
  const markdownLineCount = markdown ? markdown.split('\n').length : 0
  const generationActive = loading || typing

  const handleSectionToggle = (sectionKey) => {
    setSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }))
  }

  const addGenerationEvent = (event) => {
    setGenerationEvents((currentEvents) => [...currentEvents, event])
  }

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
            if (requestIdRef.current === requestId) {
              addGenerationEvent(event)
            }
          },
        },
        abortController.signal
      )

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
            <ActionButtons markdown={markdown} disabled={generationActive} />
          </div>

          <GenerationProgress events={generationEvents} active={generationActive} />
          <AnalysisReport report={analysisReport} />

          <section className="markdown-workspace">
            <MarkdownEditor
              markdown={markdown}
              lineCount={markdownLineCount}
              onChange={setMarkdown}
            />
            <MarkdownPreview markdown={markdown} lineCount={markdownLineCount} />
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
