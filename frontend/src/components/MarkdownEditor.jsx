// 생성된 README markdown을 textarea에서 직접 수정하는 컴포넌트
function MarkdownEditor({ markdown, onChange }) {
  return (
    <section className="markdown-editor">
      <h2>Editor</h2>
      {/* textarea 값이 markdown state와 연결되어 Preview에도 즉시 반영됨 */}
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
