// <DocumentLinkSection /> : DOCUMENTS.map(doc => <DocumentCard key={doc.key} {...doc} />)
const DOCUMENTS = [
  { key: "registry", label: "등기부등본", info: "소유권, 근저당 등 권리관계를 확인하는 문서예요" },
  { key: "building", label: "건축물대장", info: "건물의 구조, 용도, 면적 등을 확인하는 문서예요" },
  { key: "land", label: "토지대장", info: "토지의 지목, 면적, 소유자 등을 확인하는 문서예요" },
  { key: "land-use-plan", label: "토지이용계획 확인서", info: "해당 토지에 적용되는 규제와 용도지역을 확인하는 문서예요" },
];

// <span title>은 기본적으로 키보드 포커스를 받지 못해(tabindex 없으면) 마우스
// 사용자만 설명을 볼 수 있었음 — tabIndex=0을 부여해 키보드로도 도달 가능하게
// 하고, button/a와 동일한 포커스 아웃라인을 적용(globals.css .doc-info-badge:focus-visible).
function DocumentCard({ label, info }) {
  return (
    <div className="doc-card" data-component="DocumentCard">
      <div className="doc-icon-wrap">
        <div className="doc-icon" />
        <span className="doc-info-badge" tabIndex={0} title={info}>
          ?
        </span>
      </div>
      <span className="doc-label">{label}</span>
    </div>
  );
}

export default function DocumentLinkSection() {
  return (
    <div className="doc-grid" data-component="DocumentLinkSection">
      {DOCUMENTS.map(({ key, ...doc }) => (
        <DocumentCard key={key} {...doc} />
      ))}
    </div>
  );
}
