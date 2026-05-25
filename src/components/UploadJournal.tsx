"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Loader2, Sparkles, UploadCloud } from "lucide-react";
import type { SerializedRecord } from "@/lib/types";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function UploadJournal() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [records, setRecords] = useState<SerializedRecord[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [userNote, setUserNote] = useState("");
  const [capturedAt, setCapturedAt] = useState(todayInput());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadRecords() {
    const response = await fetch("/api/records");
    setRecords(await response.json());
  }

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const latest = useMemo(() => records.slice(0, 5), [records]);

  function pickFile(nextFile?: File | null) {
    if (!nextFile) return;
    setFile(nextFile);
    setMessage("");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    pickFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("先选一张照片就行。");
      return;
    }

    setLoading(true);
    setMessage("AI 正在替你整理这条记录。");
    const formData = new FormData();
    formData.append("image", file);
    formData.append("userNote", userNote);
    formData.append("capturedAt", capturedAt);

    const response = await fetch("/api/records", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error || "上传失败，请再试一次。");
      setLoading(false);
      return;
    }

    const record = (await response.json()) as SerializedRecord;
    setRecords((current) => [record, ...current]);
    setFile(null);
    setUserNote("");
    setCapturedAt(todayInput());
    setMessage("记好了，之后会自动进入报告。");
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="lazy-input-page">
      <section className="simple-hero mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-10">
        <div className="simple-copy">
          <p className="lazy-pill">
            <Sparkles size={16} />
            懒人生活记录
          </p>
          <h1>
            拍了，
            <span>就算记过。</span>
          </h1>
          <p>不写日记也没关系。上传照片，AI 帮你整理成以后能回看的生活报告。</p>
          <div className="simple-links">
            <Link href="/report">生成报告</Link>
            <Link href="/records">管理记录</Link>
          </div>
        </div>

        <form onSubmit={submit} className="simple-capture-card">
          <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" onChange={onFileChange} />

          <button
            className={`simple-upload ${preview ? "has-preview" : ""}`}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            {preview ? (
              <Image src={preview} alt="待保存照片预览" fill className="object-cover" unoptimized />
            ) : (
              <span>
                <UploadCloud size={28} />
                <strong>选择照片</strong>
                <small>说明可不写</small>
              </span>
            )}
          </button>

          <div className="simple-fields">
            <label className="simple-date">
              <CalendarDays size={16} />
              <input type="date" value={capturedAt} onChange={(event) => setCapturedAt(event.target.value)} />
            </label>
            <input value={userNote} onChange={(event) => setUserNote(event.target.value)} placeholder="一句话，可选" />
          </div>

          <button className="icon-button simple-submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            保存
          </button>

          {message ? <p className="lazy-status">{message}</p> : null}
        </form>
      </section>

      <section className="compact-memory-strip">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-8">
          <div className="compact-head">
            <h2>最近记录</h2>
            <Link href="/records">全部</Link>
          </div>
          <div className="compact-list">
            {latest.length === 0 ? (
              <p className="empty-recent">还没有记录。</p>
            ) : (
              latest.map((record) => (
                <article key={record.id}>
                  <div className="compact-thumb">
                    <Image src={record.imagePath} alt={record.aiSummary || "生活记录"} fill className="object-cover" unoptimized />
                  </div>
                  <div>
                    <p>{new Date(record.capturedAt).toLocaleDateString("zh-CN")}</p>
                    <h3>{record.aiSummary || record.userNote || "一条生活记录"}</h3>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
