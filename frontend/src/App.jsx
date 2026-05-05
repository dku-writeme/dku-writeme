import { useState } from 'react'
import UrlInput from './components/UrlInput.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'
import MarkdownEditor from './components/MarkdownEditor.jsx'
import MarkdownPreview from './components/MarkdownPreview.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import { parseGithubUrl } from './utils/parseGithubUrl.js'
import './App.css'

function App() {
  const [githubUrl, setGithubUrl] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    try {
      const result = parseGithubUrl(githubUrl)
      console.log(result)
      setMessage(`${result.owner}/${result.repo}`)
    } catch (error) {
      console.error(error)
      setMessage(error.message)
    }
  }

  return (
    <main className="app">
      <h1>dku-writeme</h1>
      <form className="url-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={githubUrl}
          onChange={(event) => setGithubUrl(event.target.value)}
          placeholder="https://github.com/dku-writeme/dku-writeme"
          aria-label="GitHub repository URL"
        />
        <button type="submit">확인</button>
      </form>
      {message && <p className="parse-result">{message}</p>}
      <section className="placeholder-panel" aria-label="README generator workspace">
        <UrlInput />
        <TemplateSelector />
        <MarkdownEditor />
        <MarkdownPreview />
        <ActionButtons />
      </section>
    </main>
  )
}

export default App
