import { useState } from 'react'
import UrlInput from './components/UrlInput.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'
import MarkdownEditor from './components/MarkdownEditor.jsx'
import MarkdownPreview from './components/MarkdownPreview.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import { requestReadme } from './api/repoApi.js'
import { parseGithubUrl } from './utils/parseGithubUrl.js'
import './App.css'

function App() {
  // README 생성에 필요한 입력값과 화면 상태를 App에서 한 번에 관리
  const [url, setUrl] = useState('')
  const [template, setTemplate] = useState('basic')
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)

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
      const response = await requestReadme(owner, repo, template)

      setMarkdown(response.markdown)
      console.log(response.markdown)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      {/* 서비스 소개 영역 */}
      <header className="app-header">
        <h1>WRITEME.md</h1>
        <p>GitHub 저장소 URL을 입력하고 원하는 템플릿으로 README 초안을 생성해보세요.</p>
      </header>

      {/* README 생성에 필요한 입력, 편집, 미리보기, 액션 버튼을 묶는 작업 영역 */}
      <section className="placeholder-panel" aria-label="README generator workspace">
        {/* URL 입력과 템플릿 선택 영역 */}
        <section className="input-panel">
          <UrlInput
            url={url}
            onChange={(event) => setUrl(event.target.value)}
            onSubmit={handleSubmit}
            loading={loading}
          />
          <TemplateSelector
            template={template}
            onChange={(event) => setTemplate(event.target.value)}
          />
        </section>

        {/* markdown state를 Editor와 Preview가 공유해 실시간으로 반영 */}
        <section className="markdown-workspace">
          <MarkdownEditor
            markdown={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
          />
          <MarkdownPreview markdown={markdown} />
        </section>

        {/* 현재 markdown 내용을 복사하거나 README.md 파일로 다운로드 */}
        <ActionButtons markdown={markdown} />
      </section>
    </main>
  )
}

export default App
