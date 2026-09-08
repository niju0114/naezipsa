import Link from "next/link";
import { CHARTS } from "@/lib/charts";

// 차트 6개를 한 번에 볼 수 있는 인덱스 페이지. 대시보드(/) 전체를 켤 필요 없이
// 여기서 원하는 차트 하나만 눌러 들어가 그 차트만 새로고침하며 작업할 수 있다.
export default function ChartsIndexPage() {
  return (
    <div className="chart-preview-page">
      <Link href="/" className="chart-preview-back">
        ← 대시보드로
      </Link>
      <h1 style={{ marginTop: 20, fontSize: 22, fontWeight: 800 }}>차트 목록</h1>
      <p style={{ marginTop: 8, color: "var(--color-text-secondary)" }}>
        차트별로 따로 열어서 개발/미리보기할 수 있어요. 실제 구현은 각
        components/charts/*.jsx 파일에 채우면 대시보드와 이 프리뷰 페이지
        양쪽에 함께 반영됩니다.
      </p>
      <div className="chart-preview-list">
        {CHARTS.map((c) => (
          <Link key={c.slug} href={`/charts/${c.slug}`}>
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
