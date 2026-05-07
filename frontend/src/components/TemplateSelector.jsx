// README 생성에 사용할 템플릿 종류를 선택하는 컴포넌트
function TemplateSelector({ template, onChange }) {
  return (
    <label className="template-selector">
      <span>Template</span>
      {/* 선택된 template 값은 App의 state로 관리 */}
      <select value={template} onChange={onChange}>
        <option value="basic">Basic</option>
        <option value="simple">Simple</option>
        <option value="badge">Badge</option>
      </select>
    </label>
  )
}

export default TemplateSelector
