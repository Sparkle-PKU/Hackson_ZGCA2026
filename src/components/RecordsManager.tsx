"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Archive, CalendarDays, MapPin, Sparkles } from "lucide-react";
import type { SerializedRecord } from "@/lib/types";

export function RecordsManager() {
  const [records, setRecords] = useState<SerializedRecord[]>([]);

  async function loadRecords() {
    const response = await fetch("/api/records");
    setRecords(await response.json());
  }

  useEffect(() => {
    loadRecords();
  }, []);

  return (
    <main className="archive-page mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="archive-head">
        <div>
          <p className="lazy-pill">
            <Archive size={16} />
            生活档案
          </p>
          <h1>记录已经放好了</h1>
          <p>这里暂时只做查看，不要求你人工修正。AI 会把这些照片和标签用于生成报告。</p>
        </div>
        <Link href="/report" className="icon-button">
          <Sparkles size={18} />
          生成报告
        </Link>
      </div>

      {records.length === 0 ? (
        <div className="archive-empty">
          还没有记录。回到首页上传第一张照片后，这里会出现你的生活档案。
        </div>
      ) : (
        <div className="archive-grid">
          {records.map((record) => (
            <article key={record.id} className="archive-card">
              <div className="archive-photo">
                <Image src={record.imagePath} alt={record.aiSummary || "生活记录"} fill className="object-cover" unoptimized />
              </div>
              <div className="archive-body">
                <div className="archive-meta">
                  <span>
                    <CalendarDays size={14} />
                    {new Date(record.capturedAt).toLocaleDateString("zh-CN")}
                  </span>
                  {record.location ? (
                    <span>
                      <MapPin size={14} />
                      {record.location}
                    </span>
                  ) : null}
                </div>
                <h2>{record.aiSummary || record.userNote || "一条生活记录"}</h2>
                {record.storyValue ? <p>{record.storyValue}</p> : null}
                <div className="archive-tags">
                  {[...record.tags, record.emotion || ""].filter(Boolean).slice(0, 5).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
