"use client";

import { useRef, useCallback } from "react";

// 프로토타입의 mousedown/mousemove/mouseup 손수 구현 드래그 재정렬을 그대로
// 옮긴 훅. 네이티브 HTML5 Drag-and-Drop API는 브라우저별 동작이 들쭉날쭉하고
// 자동화 테스트로 신뢰성 있게 검증하기 어려워 의도적으로 피했다(프로토타입
// 주석 그대로). 드래그 중에는 잡고 있는 행만 translateY로 움직이고, mouseup
// 시점에 배열을 splice로 재배치해 한 번에 커밋한다.
//
// containerRef: 행들을 담은 컨테이너(.dashboard-list)의 ref.
// items: 실제 매물 카드 배열(dashboardItems) — 추가 슬롯/빈 슬롯은 여기 포함 X.
// onReorder(nextItems): 재배치가 끝났을 때(순서가 바뀐 경우에만) 호출.
export default function useDragReorder(containerRef, items, onReorder) {
  const dragState = useRef(null);

  const startDrag = useCallback(
    (e, id) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rowEl = container.querySelector('.interest-row[data-item-id="' + id + '"]');
      if (!rowEl) return;

      const rows = Array.prototype.slice.call(
        container.querySelectorAll(".interest-row[data-item-id]")
      );
      const startIndex = rows.indexOf(rowEl);
      const startY = e.clientY;
      const gap = parseFloat(getComputedStyle(container).rowGap || "8") || 8;
      const rowHeight = rowEl.offsetHeight + gap;
      let currentIndex = startIndex;
      rowEl.classList.add("is-dragging");

      function onMove(ev) {
        const dy = ev.clientY - startY;
        rowEl.style.transform = "translateY(" + dy + "px)";
        const shift = Math.round(dy / rowHeight);
        currentIndex = Math.min(rows.length - 1, Math.max(0, startIndex + shift));
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        rowEl.classList.remove("is-dragging");
        rowEl.style.transform = "";
        if (currentIndex !== startIndex) {
          const next = items.slice();
          const moved = next.splice(startIndex, 1)[0];
          next.splice(currentIndex, 0, moved);
          onReorder(next);
        }
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [containerRef, items, onReorder]
  );

  return startDrag;
}
