"use client";

import type React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { BarChart3, BookOpen, Calendar, ChevronLeft, ChevronRight, Loader2, MapPin, MousePointerClick, RotateCcw, Sparkles } from "lucide-react";
import type { ReportPayload } from "@/lib/types";

const currentYear = new Date().getFullYear();
const monthLabels = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

type BookItem = ReportPayload["timeline"][number] & {
  tags?: string[];
};

type Spread = {
  label: string;
  left: React.ReactNode;
  right: React.ReactNode;
};

export function ReportStudio() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState("");
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    const response = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month: month ? Number(month) : undefined })
    });
    setReport(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function generateInitial() {
      setLoading(true);
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear })
      });
      const data = await response.json();
      if (!cancelled) {
        setReport(data);
        setLoading(false);
      }
    }

    generateInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="book-stage">
      <section className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[330px_1fr] lg:px-8">
        <aside className="book-control h-fit p-5 lg:sticky lg:top-24">
          <p className="mb-3 inline-flex items-center gap-2 border border-black/10 bg-white/70 px-3 py-1 text-sm text-[#75614f]">
            <BookOpen size={16} color="#202a3d" />
            翻书报告模板
          </p>
          <h1 className="text-3xl font-black leading-tight text-[#202a3d]">把年度报告翻成一本生活书</h1>
          <p className="mt-3 text-sm leading-7 text-[#75614f]">参考你给的样式：牛皮纸桌面、白色双页、月份圆标、照片排版和翻页动效。</p>

          <form onSubmit={generate} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">年份</span>
              <input className="field" type="number" value={year} min={2000} max={2100} onChange={(event) => setYear(Number(event.target.value))} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">月份，可选</span>
              <select className="field" value={month} onChange={(event) => setMonth(event.target.value)}>
                <option value="">全年报告</option>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1} 月
                  </option>
                ))}
              </select>
            </label>
            <button className="icon-button w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
              重新生成
            </button>
          </form>

          <div className="mt-5 flex items-start gap-2 border border-[#202a3d]/10 bg-[#fffef8]/70 p-3 text-sm leading-6 text-[#75614f]">
            <MousePointerClick size={18} className="mt-1 shrink-0" color="#e2b84d" />
            点击书页两侧按钮，或用键盘左右方向键翻页。
          </div>
        </aside>

        <div className="min-w-0">{report ? <ReportBook report={report} /> : <ReportSkeleton />}</div>
      </section>
    </main>
  );
}

function ReportSkeleton() {
  return (
    <div className="book-desk flex min-h-[680px] items-center justify-center">
      <div className="book-loading">
        <Loader2 className="mx-auto animate-spin" color="#202a3d" />
        <p className="mt-4 font-bold">正在装订你的生活书...</p>
      </div>
    </div>
  );
}

function ReportBook({ report }: { report: ReportPayload }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const spreads = useMemo(() => makeSpreads(report), [report]);
  const totalPages = spreads.length + 1;
  const coverImage = report.moments[0]?.imagePath || report.timeline[0]?.imagePath;
  const currentSpread = spreads[Math.max(0, pageIndex - 1)];
  const progress = Math.round(((pageIndex + 1) / totalPages) * 100);

  useEffect(() => {
    setPageIndex(0);
  }, [report]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        go(1);
      }
      if (event.key === "ArrowLeft") {
        go(-1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function go(direction: 1 | -1) {
    setPageIndex((current) => {
      const next = Math.min(totalPages - 1, Math.max(0, current + direction));
      if (next !== current) {
        setTurning(direction === 1 ? "next" : "prev");
        window.setTimeout(() => setTurning(null), 620);
      }
      return next;
    });
  }

  return (
    <section className="book-desk">
      <div className="book-toolbar" aria-label="报告翻页控制">
        <button className="book-nav-button" onClick={() => go(-1)} disabled={pageIndex === 0} aria-label="上一页">
          <ChevronLeft size={22} />
        </button>
        <div className="book-progress">
          <span>{pageIndex === 0 ? "封面" : currentSpread?.label}</span>
          <div className="book-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="book-nav-button" onClick={() => go(1)} disabled={pageIndex === totalPages - 1} aria-label="下一页">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className={`book-wrap ${turning ? `is-turning-${turning}` : ""}`}>
        {pageIndex === 0 ? (
          <button className="book-cover" onClick={() => go(1)} aria-label="打开报告书">
            <div className="cover-photo">
              {coverImage ? <Image src={coverImage} alt={report.title} fill className="object-cover" unoptimized /> : null}
            </div>
            <div className="cover-meta">
              <p className="cover-kicker">MY LIFE REPORT</p>
              <h2>{report.title.replace("生活回声", "") || report.title}</h2>
              <p>{report.subtitle}</p>
              <div className="cover-player">
                <span>05:20</span>
                <div />
                <span>13:14</span>
              </div>
              <p className="cover-hint">点击打开</p>
            </div>
          </button>
        ) : (
          <div className="open-book" aria-live="polite">
            <div className="page-half left-page">{currentSpread.left}</div>
            <div className="book-gutter" />
            <div className="page-half right-page">{currentSpread.right}</div>
            {turning ? <div className="turning-page" /> : null}
          </div>
        )}
      </div>
    </section>
  );
}

function makeSpreads(report: ReportPayload): Spread[] {
  const items = report.timeline.map((item) => ({
    ...item,
    tags: report.moments.find((moment) => moment.id === item.id)?.tags || []
  }));
  const byMonth = groupByMonth(items);
  const monthSpreads = Array.from(byMonth.entries()).map(([month, monthItems], index) => ({
    label: month,
    left: <MonthLeftPage month={month} items={monthItems} pageNumber={index * 2 + 2} />,
    right: <MonthRightPage month={month} items={monthItems} pageNumber={index * 2 + 3} />
  }));

  return [
    {
      label: "序章",
      left: <BlankIntroPage />,
      right: <OpeningPage report={report} pageNumber={1} />
    },
    {
      label: "年度索引",
      left: <StatsPage report={report} pageNumber={2} />,
      right: <KeywordPage report={report} pageNumber={3} />
    },
    ...monthSpreads,
    {
      label: "尾声",
      left: <TimelinePage report={report} pageNumber={monthSpreads.length * 2 + 4} />,
      right: <ClosingPage report={report} pageNumber={monthSpreads.length * 2 + 5} />
    }
  ];
}

function groupByMonth(items: BookItem[]) {
  const map = new Map<string, BookItem[]>();
  for (const item of items) {
    const match = item.date.match(/^(\d+)月/);
    const key = match ? `${match[1]}月` : "记忆";
    map.set(key, [...(map.get(key) || []), item]);
  }
  return new Map([...map.entries()].sort(([a], [b]) => monthOrder(a) - monthOrder(b)));
}

function monthOrder(label: string) {
  const index = monthLabels.indexOf(label);
  return index === -1 ? 99 : index;
}

function PageNumber({ value }: { value: number }) {
  return <span className="page-number">· {value} ·</span>;
}

function BlankIntroPage() {
  return (
    <div className="book-page center-poem">
      <p>这一页留白，给那些没有拍下来的日子。</p>
    </div>
  );
}

function OpeningPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page opening-page">
      <div>
        <p className="book-kicker">这一年，你是否更爱自己了一些</p>
        <h3>{report.title}</h3>
        <p>{report.opening}</p>
      </div>
      <div className="poem-lines">
        <p>这一年</p>
        <p>我爱上了发呆</p>
        <p>爱上了和朋友见面</p>
        <p>也爱上了认真记录自己</p>
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function StatsPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  const topLocation = report.stats.topLocations[0]?.name || "待发现";
  const topActivity = report.stats.topActivities[0]?.name || "生活记录";
  const topEmotion = report.stats.topEmotions[0]?.name || "平静";

  return (
    <div className="book-page stats-page">
      <p className="book-kicker">年度索引</p>
      <h3>你把生活保存成了这些数字</h3>
      <div className="book-stat-grid">
        <MiniStat icon={<BarChart3 size={18} />} label="记录" value={report.stats.totalRecords} />
        <MiniStat icon={<Calendar size={18} />} label="天数" value={report.stats.activeDays} />
        <MiniStat icon={<MapPin size={18} />} label="常去" value={topLocation} />
        <MiniStat icon={<Sparkles size={18} />} label="心情" value={topEmotion} />
      </div>
      <p className="book-note">如果给这一年做一个脚注，它大概会写着：{topActivity}、{topLocation}、以及很多没有被浪费的小瞬间。</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="mini-stat">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeywordPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page keyword-page">
      <p className="book-kicker">关键词</p>
      <h3>反复出现的词，是生活给你的暗号</h3>
      <div className="keyword-cloud">
        {report.keywords.map((keyword, index) => (
          <span style={{ transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)` }} key={keyword}>
            {keyword}
          </span>
        ))}
      </div>
      <RankList title="常做的事" items={report.stats.topActivities} />
      <PageNumber value={pageNumber} />
    </div>
  );
}

function MonthLeftPage({ month, items, pageNumber }: { month: string; items: BookItem[]; pageNumber: number }) {
  const first = items[0];
  return (
    <div className="book-page month-page">
      <div className="month-badge">{month}</div>
      <h3>{month}，{first?.emotion || "普通"}也值得被写下来</h3>
      <p>{first?.summary || "这个月的记忆正在等待更多照片。"}</p>
      <PhotoMosaic items={items.slice(0, 3)} />
      <PageNumber value={pageNumber} />
    </div>
  );
}

function MonthRightPage({ month, items, pageNumber }: { month: string; items: BookItem[]; pageNumber: number }) {
  return (
    <div className="book-page month-page month-right-page">
      <h3>{month}的几段小事</h3>
      <div className="month-story-list">
        {items.slice(0, 4).map((item) => (
          <article key={item.id}>
            <span>{item.date}</span>
            <p>{item.summary}</p>
            <small>{[item.location, item.emotion].filter(Boolean).join(" / ") || "生活记录"}</small>
          </article>
        ))}
      </div>
      <PhotoStrip items={items.slice(1, 4)} />
      <PageNumber value={pageNumber} />
    </div>
  );
}

function PhotoMosaic({ items }: { items: BookItem[] }) {
  if (items.length === 0) {
    return <div className="empty-photo">等待照片</div>;
  }

  return (
    <div className="photo-mosaic">
      {items.map((item) => (
        <figure key={item.id}>
          <Image src={item.imagePath} alt={item.summary} fill className="object-cover" unoptimized />
        </figure>
      ))}
    </div>
  );
}

function PhotoStrip({ items }: { items: BookItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="photo-strip">
      {items.map((item) => (
        <figure key={item.id}>
          <Image src={item.imagePath} alt={item.summary} fill className="object-cover" unoptimized />
        </figure>
      ))}
    </div>
  );
}

function TimelinePage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page timeline-page">
      <p className="book-kicker">时间线</p>
      <h3>这些日期，替你把一年钉住</h3>
      <div className="timeline-mini">
        {report.timeline.slice(-6).reverse().map((item) => (
          <p key={item.id}>
            <span>{item.date}</span>
            {item.summary}
          </p>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function ClosingPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page closing-page">
      <Sparkles size={28} color="#e2b84d" />
      <h3>最后一页</h3>
      <p>{report.closing}</p>
      <p className="book-note">愿你下一次回看时，不只是想起发生了什么，也想起当时的自己多么具体。</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function RankList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <div className="rank-list">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p>等待更多记录</p>
      ) : (
        items.slice(0, 4).map((item) => (
          <div key={item.name}>
            <span>{item.name}</span>
            <strong>x{item.count}</strong>
          </div>
        ))
      )}
    </div>
  );
}
