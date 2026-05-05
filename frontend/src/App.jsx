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
  const [url, setUrl] = useState('')
  const [template, setTemplate] = useState('basic')
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)

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
      <header className="app-header">
        <h1>dku-writeme</h1>
        <p>GitHub 저장소 URL을 입력하고 원하는 템플릿으로 README 초안을 생성해보세요.</p>
      </header>
      <section className="placeholder-panel" aria-label="README generator workspace">
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
        <section className="markdown-workspace">
          <MarkdownEditor
            markdown={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
          />
          <MarkdownPreview markdown={markdown} />
        </section>
        <ActionButtons markdown={markdown} />
      </section>
    </main>
  )
}

export default App
