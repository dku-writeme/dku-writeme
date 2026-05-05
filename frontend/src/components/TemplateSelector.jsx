function TemplateSelector({ template, onChange }) {
  return (
    <label className="template-selector">
      <span>Template</span>
      <select value={template} onChange={onChange}>
        <option value="basic">Basic</option>
        <option value="simple">Simple</option>
        <option value="badge">Badge</option>
      </select>
    </label>
  )
}

export default TemplateSelector
