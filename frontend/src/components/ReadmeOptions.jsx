import { CheckIcon } from './Icons.jsx'

const SECTION_OPTIONS = [
  { key: 'overview', label: '개요' },
  { key: 'repositoryInfo', label: '저장소 정보' },
  { key: 'techStack', label: '기술 스택' },
  { key: 'features', label: '주요 기능' },
  { key: 'installation', label: '설치 방법' },
  { key: 'usage', label: '실행 방법' },
  { key: 'build', label: '빌드 방법' },
  { key: 'test', label: '테스트 방법' },
  { key: 'projectStructure', label: '프로젝트 구조' },
  { key: 'importantFiles', label: '핵심 파일' },
  { key: 'scripts', label: '실행 스크립트' },
  { key: 'license', label: '라이선스' },
]

function ReadmeOptions({ sections, selectedCount, totalCount, onSectionToggle }) {
  return (
    <section className="readme-options" aria-label="README generation options">
      <div className="section-heading">
        <span className="step-badge">02</span>
        <div>
          <h2>구성 섹션</h2>
          <p>
            {selectedCount}/{totalCount} selected
          </p>
        </div>
      </div>
      <div className="section-options">
        <div className="section-option-grid">
          {SECTION_OPTIONS.map((section) => (
            <label key={section.key} className="section-option">
              <input
                type="checkbox"
                checked={sections[section.key]}
                onChange={() => onSectionToggle(section.key)}
              />
              <span className="option-check" aria-hidden="true">
                <CheckIcon />
              </span>
              <span>{section.label}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ReadmeOptions
