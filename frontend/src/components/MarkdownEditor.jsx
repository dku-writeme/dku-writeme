function MarkdownEditor({ markdown, onChange }) {
  return (
    <section className="markdown-editor">
      <h2>Editor</h2>
      <textarea
        value={markdown}
        onChange={onChange}
        placeholder="생성된 README가 여기에 표시됩니다."
        aria-label="Markdown editor"
      />
    </section>
  )
}

export default MarkdownEditor
