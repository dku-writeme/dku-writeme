import { useState } from 'react'
import UrlInput from './components/UrlInput.jsx'
import MarkdownEditor from './components/MarkdownEditor.jsx'
import MarkdownPreview from './components/MarkdownPreview.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import ReadmeOptions from './components/ReadmeOptions.jsx'
import { requestReadme } from './api/repoApi.js'
import { parseGithubUrl } from './utils/parseGithubUrl.js'
import './App.css'

const DEFAULT_SECTIONS = {
  overview: true,
  repositoryInfo: true,
  techStack: true,
  features: true,
  installation: true,
  usage: true,
  build: true,
  test: true,
  projectStructure: true,
  importantFiles: true,
  scripts: true,
  license: true,
}

function App() {
  // README 생성에 필요한 입력값과 화면 상태를 App에서 한 번에 관리
  const [url, setUrl] = useState('')
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)
  const selectedSectionCount = Object.values(sections).filter(Boolean).length
  const totalSectionCount = Object.keys(DEFAULT_SECTIONS).length
  const markdownLineCount = markdown ? markdown.split('\n').length : 0

  const handleSectionToggle = (sectionKey) => {
    setSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }))
  }

  // URL 검증 -> owner/repo 파싱 -> README 생성 API 호출 순서로 실행
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!url.trim()) {
      alert('GitHub 저장소 URL을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const { owner, repo } = parseGithubUrl(url)
      const response = await requestReadme(owner, repo, {
        sections,
      })

      setMarkdown(response.markdown)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
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
            <p className="eyebrow">AI README BUILDER</p>
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
            <ActionButtons markdown={markdown} />
          </div>

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
