import Link from "next/link";
import { notFound } from "next/navigation";
import { CHARTS } from "@/lib/charts";

// 차트 하나를 단독으로 크게 띄워 개발/미리보기하는 페이지 —
// /charts/real-trade-distribution, /charts/macro-data 등. slug는
// lib/charts.js의 CHARTS 배열과 맞춰져 있다.
export function generateStaticParams() {
  return CHARTS.map((c) => ({ slug: c.slug }));
}

export default async function ChartPreviewPage({ params }) {
  const { slug } = await params;
  const chart = CHARTS.find((c) => c.slug === slug);
  if (!chart) notFound();

  const { Component, title } = chart;
  return (
    <div className="chart-preview-page">
      <Link href="/charts" className="chart-preview-back">
        ← 차트 목록으로
      </Link>
      <h1 style={{ marginTop: 20, fontSize: 22, fontWeight: 800 }}>{title}</h1>
      <p style={{ marginTop: 8, color: "var(--color-text-secondary)" }}>
        이 컴포넌트는 components/charts/{Component.name}.jsx 에 있어요. 여기서
        직접 수정하면서 확인하면, 같은 컴포넌트를 쓰는 대시보드(/)에도 그대로
        반영됩니다.
      </p>
      <div style={{ marginTop: 24 }}>
        <Component />
      </div>
    </div>
  );
}
