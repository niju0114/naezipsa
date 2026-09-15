"use client";

// <ImportShareModal /> : URL에 ?share=<token>이 있을 때(공유 링크로 들어온
// 경우) 뜨는 확인 모달. 공유받은 관심 매물 미리보기를 보여주고, "내 목록에
// 추가"를 누르면 지금 내 관심 매물 목록 뒤에 이어 붙인다.
//
// 교체가 아니라 "추가"인 이유: 공유는 남이 보낸 링크를 여는 것뿐인데,
// 그걸 열었다고 내가 이미 만들어둔 목록이 통째로 사라지면 안 되기 때문이다.
export default function ImportShareModal({ open, items, onImport, onCancel }) {
  return (
    <div
      className={"edit-overlay" + (open ? " is-open" : "")}
      inert={!open}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="edit-dialog" role="dialog" aria-modal="true" aria-label="공유받은 관심 매물">
        <div className="edit-dialog-title">공유받은 관심 매물</div>
        <div className="edit-dialog-name">
          {items.length}개의 매물을 받았어요. 내 목록에 추가할까요?
        </div>

        <div className="share-preview-list">
          {items.map((item, i) => (
            <div className="share-preview-row" key={i}>
              <span className="share-preview-name">
                {item.complex_name || "단지 정보 준비중"}
              </span>
              <span className="share-preview-size">
                {item.representative_area != null
                  ? `${item.representative_area}㎡`
                  : `평형 ${item.size_id}`}
              </span>
            </div>
          ))}
        </div>

        <div className="edit-dialog-actions">
          <button type="button" className="edit-dialog-cancel" tabIndex={0} onClick={onCancel}>
            닫기
          </button>
          <button type="button" className="edit-dialog-save" tabIndex={0} onClick={onImport}>
            내 목록에 추가
          </button>
        </div>
      </div>
    </div>
  );
}
