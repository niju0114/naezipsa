"use client";

import { useCallback, useRef, useState } from "react";

// 프로토타입의 showToast()/toastTimer를 그대로 옮긴 훅. 2.6초 뒤 자동으로
// 사라지고, 연속으로 show()가 호출되면 이전 타이머를 취소하고 다시 2.6초를
// 센다(clearTimeout(toastTimer) 그대로).
export default function useToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  return { message, visible, show };
}
