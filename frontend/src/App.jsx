import UrlInput from './components/UrlInput.jsx'
import TemplateSelector from './components/TemplateSelector.jsx'
import MarkdownEditor from './components/MarkdownEditor.jsx'
import MarkdownPreview from './components/MarkdownPreview.jsx'
import ActionButtons from './components/ActionButtons.jsx'
import './App.css'

function App() {
  return (
    <main className="app">
      <h1>dku-writeme</h1>
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
