"use client";

// <ChipGroup options value onChange /> : 향/인테리어처럼 라디오처럼 하나만
// 선택되는 칩 그룹. 같은 값을 다시 누르면 선택 해제(null)된다 — 프로토타입의
// data-chip-group 이벤트 위임 로직을 대체하는 재사용 컴포넌트.
export default function ChipGroup({ options, value, onChange }) {
  return (
    <div className="chip-row">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            tabIndex={0}
            role="radio"
            aria-checked={selected}
            className={"chip" + (selected ? " is-selected" : "")}
            onClick={() => onChange(selected ? null : opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
