import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AiRecordInsight, SerializedRecord } from "@/lib/types";
import { jsonArray } from "@/lib/types";

const FALLBACK_TAGS = ["生活切片", "值得记住"];

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getApiConfig() {
  return {
    provider: process.env.LLM_PROVIDER || "openai_compatible",
    baseUrl: (process.env.LLM_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "",
    textModel: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    visionModel: process.env.VISION_MODEL || process.env.LLM_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini",
    textTemperature: Number(process.env.LLM_TEMPERATURE ?? 0.3),
    visionTemperature: Number(process.env.VISION_TEMPERATURE ?? process.env.LLM_TEMPERATURE ?? 0.2),
    maxTokens: Number(process.env.LLM_MAX_TOKENS ?? 1200)
  };
}

function normalizeArray(value: unknown): string[] {
  return jsonArray(value).slice(0, 8);
}

function coerceInsight(value: Partial<AiRecordInsight> | null | undefined): AiRecordInsight {
  const tags = normalizeArray(value?.tags);
  return {
    summary: value?.summary?.trim() || "这是一段被认真保存下来的日常记忆。",
    date_hint: value?.date_hint,
    location: value?.location?.trim() || "",
    people: normalizeArray(value?.people),
    activities: normalizeArray(value?.activities),
    food: normalizeArray(value?.food),
    objects: normalizeArray(value?.objects),
    transport: normalizeArray(value?.transport),
    emotion: value?.emotion?.trim() || "平静",
    tags: tags.length > 0 ? tags : FALLBACK_TAGS,
    story_value: value?.story_value?.trim() || "它也许不宏大，但构成了这一段生活的真实纹理。"
  };
}

function extractJson(text: string) {
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThink.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? withoutThink;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Partial<AiRecordInsight>;
  } catch {
    return null;
  }
}

function localFallbackInsight(userNote: string | null | undefined): AiRecordInsight {
  const note = userNote?.trim();
  const tags = note ? Array.from(new Set([...note.split(/[，,。.\s]+/).filter(Boolean).slice(0, 4), ...FALLBACK_TAGS])) : FALLBACK_TAGS;
  return coerceInsight({
    summary: note ? `你记录了：${note}` : "一张日常照片，被收进了今年的生活档案。",
    activities: note ? ["随手记录"] : ["生活记录"],
    emotion: note?.match(/开心|快乐|高兴|兴奋/) ? "开心" : "温柔",
    tags,
    story_value: "这条记录会在报告里成为一个小坐标，提醒你生活并不是空白地滑过去。"
  });
}

async function callChatCompletions(body: Record<string, unknown>) {
  const config = getApiConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function analyzeImage(imageFilePath: string, userNote?: string | null): Promise<AiRecordInsight> {
  const config = getApiConfig();
  if (!config.apiKey) return localFallbackInsight(userNote);

  try {
    const buffer = await readFile(imageFilePath);
    const ext = path.extname(imageFilePath).replace(".", "").toLowerCase() || "jpeg";
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    const content = await callChatCompletions({
      model: config.visionModel,
      temperature: config.visionTemperature,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "system",
          content:
            "你是一个生活记录整理助手。你只输出严格 JSON，不要输出 markdown，不要解释。不要编造敏感身份、精确地点或人物关系；没有把握时留空或使用泛化表达。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "请理解这张生活照片和用户文字，输出 JSON。字段必须包含：summary,date_hint,location,people,activities,food,objects,transport,emotion,tags,story_value。people、activities、food、objects、transport、tags 必须是中文字符串数组。summary 控制在 30 字以内，story_value 控制在 45 字以内。用户文字：" +
                (userNote || "无")
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    });

    const parsed = extractJson(content);
    return coerceInsight(parsed);
  } catch {
    return localFallbackInsight(userNote);
  }
}

export async function writeReportNarrative(records: SerializedRecord[], fallback: string) {
  const config = getApiConfig();
  if (!config.apiKey || records.length === 0) return fallback;

  try {
    const brief = records.map((record) => ({
      date: record.capturedAt.slice(0, 10),
      note: record.userNote,
      summary: record.aiSummary,
      location: record.location,
      activities: record.activities,
      emotion: record.emotion,
      tags: record.tags
    }));

    const content = await callChatCompletions({
      model: config.textModel,
      temperature: config.textTemperature,
      max_tokens: Math.min(config.maxTokens, 800),
      messages: [
        {
          role: "system",
          content: "你是一个克制、温柔的生活报告编辑。基于真实记录总结，不编造不存在的事实。"
        },
        {
          role: "user",
          content: `根据这些生活记录，写一段 120 字以内、有画面感但不夸张的中文年度/月度开场白。只返回正文。\n${JSON.stringify(brief)}`
        }
      ]
    });

    return content || fallback;
  } catch {
    return fallback;
  }
}
