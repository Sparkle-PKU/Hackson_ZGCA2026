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
  imageDescription?: string | null;
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
            年度回顾报告
          </p>
          <h1 className="text-3xl font-black leading-tight text-[#202a3d]">把这一年翻成一本生活书</h1>
          <p className="mt-3 text-sm leading-7 text-[#75614f]">AI 会从你的生活记录中提炼主题、筛选重要瞬间，生成一份有叙事感的年度回顾。</p>

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
        <p className="mt-4 font-bold">正在装订你的年度报告...</p>
      </div>
    </div>
  );
}

function ReportBook({ report }: { report: ReportPayload }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const spreads = useMemo(() => makeSpreads(report), [report]);
  const totalPages = spreads.length + 1;
  const coverImage = report.coverImage || report.timeline[0]?.imagePath;
  const currentSpread = spreads[Math.max(0, pageIndex - 1)];
  const progress = Math.round(((pageIndex + 1) / totalPages) * 100);

  useEffect(() => {
    setPageIndex(0);
  }, [report]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
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
              <p className="cover-kicker">ANNUAL REVIEW</p>
              <h2>{report.themeName || report.title}</h2>
              <p>{report.subtitle}</p>
              <div className="cover-player">
                <span>{report.stats.totalRecords} 条记录</span>
                <div />
                <span>{report.stats.activeDays} 个日子</span>
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
  const spreads: Spread[] = [];

  // Spread 1: Prologue + Keywords
  spreads.push({
    label: "序章",
    left: <BlankIntroPage />,
    right: <ProloguePage report={report} pageNumber={1} />
  });

  // Spread 2: Stats
  spreads.push({
    label: "数据",
    left: <StatsPage report={report} pageNumber={2} />,
    right: <KeywordPage report={report} pageNumber={3} />
  });

  // Year narrative spreads
  report.yearNarrative.forEach((chapter, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      const nextChapter = report.yearNarrative[index + 1];
      spreads.push({
        label: chapter.title,
        left: <NarrativeLeftPage chapter={chapter} pageNumber={spreads.length * 2 + 2} />,
        right: nextChapter ? (
          <NarrativeRightPage chapter={nextChapter} pageNumber={spreads.length * 2 + 3} />
        ) : (
          <BlankIntroPage />
        )
      });
    }
  });

  // Feature section spreads
  report.featureSections.forEach((section) => {
    spreads.push({
      label: section.title,
      left: <FeatureLeftPage section={section} pageNumber={spreads.length * 2 + 2} />,
      right: <FeatureRightPage section={section} pageNumber={spreads.length * 2 + 3} />
    });
  });

  // Moments spread
  if (report.moments.length > 0) {
    spreads.push({
      label: "重要瞬间",
      left: <MomentsLeftPage moments={report.moments.slice(0, 4)} pageNumber={spreads.length * 2 + 2} />,
      right: <MomentsRightPage moments={report.moments.slice(4, 9)} pageNumber={spreads.length * 2 + 3} />
    });
  }

  // Self-portrait + Closing
  spreads.push({
    label: "尾声",
    left: <SelfPortraitPage report={report} pageNumber={spreads.length * 2 + 2} />,
    right: <ClosingPage report={report} pageNumber={spreads.length * 2 + 3} />
  });

  return spreads;
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

// ─── Prologue ────────────────────────────────────────────

function ProloguePage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page opening-page">
      <div>
        <p className="book-kicker">{report.themeName}</p>
        <h3>{report.title}</h3>
        <p>{report.prologue}</p>
      </div>
      <div className="poem-lines">
        {report.keywords.slice(0, 4).map((kw) => (
          <p key={kw}>{kw}</p>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

// ─── Stats ───────────────────────────────────────────────

function StatsPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  const topLocation = report.stats.topLocations[0] || "待发现";
  const topActivity = report.stats.topActivities[0] || "生活记录";
  const topEmotion = report.stats.topEmotions[0] || "平静";

  return (
    <div className="book-page stats-page">
      <p className="book-kicker">年度数据</p>
      <h3>你把生活保存成了这些数字</h3>
      <div className="book-stat-grid">
        <MiniStat icon={<BarChart3 size={18} />} label="记录" value={report.stats.totalRecords} />
        <MiniStat icon={<Calendar size={18} />} label="天数" value={report.stats.activeDays} />
        <MiniStat icon={<MapPin size={18} />} label="常去" value={topLocation} />
        <MiniStat icon={<Sparkles size={18} />} label="心情" value={topEmotion} />
      </div>
      <p className="book-note">
        如果给这一年做一个脚注，它大概会写着：{topActivity}、{topLocation}、以及很多没有被浪费的小瞬间。
      </p>
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
      <div className="rank-list">
        <h4>高频地点</h4>
        {report.stats.topLocations.slice(0, 4).map((loc) => (
          <div key={loc}><span>{loc}</span></div>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

// ─── Year Narrative ──────────────────────────────────────

function NarrativeLeftPage({ chapter, pageNumber }: { chapter: ReportPayload["yearNarrative"][number]; pageNumber: number }) {
  return (
    <div className="book-page narrative-page">
      <p className="book-kicker">年度叙事</p>
      <h3>{chapter.title}</h3>
      <p>{chapter.text}</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function NarrativeRightPage({ chapter, pageNumber }: { chapter: ReportPayload["yearNarrative"][number]; pageNumber: number }) {
  return (
    <div className="book-page narrative-page narrative-right-page">
      <h3>{chapter.title}</h3>
      <p>{chapter.text}</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

// ─── Feature Sections ────────────────────────────────────

function FeatureLeftPage({ section, pageNumber }: { section: ReportPayload["featureSections"][number]; pageNumber: number }) {
  return (
    <div className="book-page feature-page">
      <p className="book-kicker">主题特辑</p>
      <h3>{section.title}</h3>
      <p className="feature-subtitle">{section.subtitle}</p>
      <p>{section.text}</p>
      <div className="feature-tags">
        {section.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function FeatureRightPage({ section, pageNumber }: { section: ReportPayload["featureSections"][number]; pageNumber: number }) {
  return (
    <div className="book-page feature-page feature-right-page">
      <h3>{section.title} · 影像</h3>
      <div className="photo-mosaic">
        {section.images.slice(0, 4).map((img, i) => (
          <figure key={i}>
            <Image src={img} alt={section.title} fill className="object-cover" unoptimized />
          </figure>
        ))}
      </div>
      <p>{section.text}</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

// ─── Moments ─────────────────────────────────────────────

function MomentsLeftPage({ moments, pageNumber }: { moments: ReportPayload["moments"]; pageNumber: number }) {
  return (
    <div className="book-page moments-page">
      <p className="book-kicker">值得被记住的瞬间</p>
      <h3>这些时刻，定义了你的这一年</h3>
      <div className="month-story-list">
        {moments.map((moment, i) => (
          <article key={i}>
            <span>{moment.date}</span>
            <p>{moment.title}</p>
            <small>{moment.text}</small>
          </article>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function MomentsRightPage({ moments, pageNumber }: { moments: ReportPayload["moments"]; pageNumber: number }) {
  return (
    <div className="book-page moments-page moments-right-page">
      <h3>更多瞬间</h3>
      <div className="photo-mosaic">
        {moments.slice(0, 4).map((moment, i) => (
          <figure key={i}>
            <Image src={moment.image} alt={moment.title} fill className="object-cover" unoptimized />
          </figure>
        ))}
      </div>
      <div className="month-story-list">
        {moments.map((moment, i) => (
          <article key={i}>
            <span>{moment.date}</span>
            <p>{moment.title}</p>
          </article>
        ))}
      </div>
      <PageNumber value={pageNumber} />
    </div>
  );
}

// ─── Self Portrait + Closing ─────────────────────────────

function SelfPortraitPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page self-portrait-page">
      <p className="book-kicker">这一年里的你</p>
      <h3>回看自己</h3>
      <p>{report.selfPortrait}</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}

function ClosingPage({ report, pageNumber }: { report: ReportPayload; pageNumber: number }) {
  return (
    <div className="book-page closing-page">
      <Sparkles size={28} color="#e2b84d" />
      <h3>写给未来</h3>
      <p className="closing-quote">{report.closing}</p>
      <p className="book-note">愿你下一次回看时，不只是想起发生了什么，也想起当时的自己多么具体。</p>
      <PageNumber value={pageNumber} />
    </div>
  );
}
