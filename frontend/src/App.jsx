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
      <h1>dku-writeme</h1>
      <section className="placeholder-panel" aria-label="README generator workspace">
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
