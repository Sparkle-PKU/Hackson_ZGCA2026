import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AiRecordInsight, SerializedRecord, StructuredReport } from "@/lib/types";
import { jsonArray } from "@/lib/types";

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `你是一个图片内容分析器。
请根据用户上传的图片，输出简洁、客观、具体的中文画面描述。
不要总结情绪，不要写空话，不要夸张，不要加入看不见的信息。
只输出一句话，控制在 20 到 40 字。`;

const REPORT_SYSTEM_PROMPT = `你是一个个人年度回顾报告生成 AI。

用户在过去一年中积累了许多生活记录。每条记录包含日期、照片链接、用户随手写的一句话，以及 AI 对照片内容的结构化理解。你的任务是根据这些记录，生成一份有重点、有情绪、有叙事感的年度回顾报告。

这不是相册拼图，也不是数据看板。你需要帮助用户从零散记录中看见这一年真正值得记住的东西。

核心目标：
请根据用户一整年的记录，筛选重要片段、合并相似事件、提炼反复出现的主题，并生成一份中文年度回顾报告。

写作风格：
- 真实
- 克制
- 温柔
- 细腻
- 有叙事感
- 像一个了解用户的朋友在总结这一年
- 不要夸张
- 不要鸡汤
- 不要营销文案
- 不要按月份机械流水账
- 不要简单罗列数据
- 不要编造输入中不存在的重大事件

你需要完成的分析：
1. 统计这一年有多少条记录、覆盖多少个不同日期。
2. 提取高频地点、活动、情绪、主题标签。
3. 根据 story_value、用户描述、照片内容，挑选最有代表性的重点瞬间。
4. 合并相似记录，形成几个年度主题，例如：旅行、美食、朋友、家人、工作、学习、成长、独处、日常、兴趣、关系、变化等。
5. 提炼这一年的整体主题名和副标题。
6. 写一段 100 字左右的年度序言。
7. 写 2-4 段年度叙事章节，不要按月份，而是按主题、情绪或生活线索组织。
8. 输出 3-5 个主题特辑。
9. 输出 5-9 个最值得被记住的重点瞬间。
10. 最后写一段"这一年里的你"和一句"给未来的寄语"。

重要规则：
- 所有内容必须基于输入记录。
- 不要虚构人物、地点、事件或关系。
- 如果信息不明确，用模糊但诚实的表达。
- moments 优先选择 story_value 高、描述具体、画面内容清晰的记录。
- featureSections 不要超过 5 个。
- yearNarrative 不要超过 4 段。
- 不要把报告写成月份总结。
- 不要把所有照片都放进 moments 或 featureSections。
- 语言要有情绪价值，但必须具体。
- 只输出 JSON，不要 markdown，不要解释。`;

const OUTPUT_SCHEMA_HINT = `输出格式：
{
  "themeName": "这一年的整体主题名",
  "subtitle": "一句简短副标题",
  "title": "年度报告标题",
  "coverImage": "选择最适合作为封面的 imageUrl",
  "prologue": "100 字左右的年度序言",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "stats": {
    "totalRecords": 0,
    "activeDays": 0,
    "topLocations": ["地点1", "地点2"],
    "topActivities": ["活动1", "活动2"],
    "topEmotions": ["情绪1", "情绪2"]
  },
  "yearNarrative": [
    {
      "title": "章节标题",
      "text": "按主题、情绪或生活线索组织的一段年度叙事"
    }
  ],
  "featureSections": [
    {
      "title": "主题特辑标题",
      "subtitle": "短副标题",
      "text": "这一主题下的年度叙事",
      "tags": ["标签1", "标签2"],
      "images": ["相关 imageUrl1", "相关 imageUrl2"]
    }
  ],
  "moments": [
    {
      "title": "重点瞬间标题",
      "date": "YYYY-MM-DD",
      "text": "这个瞬间为什么值得被记住",
      "image": "对应 imageUrl"
    }
  ],
  "selfPortrait": "这一年里的用户呈现出怎样的状态、变化或生活倾向",
  "closing": "一句温柔、有力量、写给未来的寄语"
}`;

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
    story_value: value?.story_value?.trim() || "它也许不宏大，但构成了这一段生活的真实纹理。",
    imageDescription: value?.imageDescription?.trim() || ""
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

function extractStructuredJson(text: string): StructuredReport | null {
  const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = withoutThink.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? withoutThink;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as StructuredReport;
  } catch {
    return null;
  }
}

function localFallbackInsight(userNote: string | null | undefined): AiRecordInsight {
  const note = userNote?.trim();
  const tags = note ? Array.from(new Set([...note.split(/[，,。.\s]+/).filter(Boolean).slice(0, 4), ...FALLBACK_TAGS])) : FALLBACK_TAGS;
  return coerceInsight({
    summary: note ? `你记录了：${note}` : "一张日常照片，被收进了今年的生活档案。",
    imageDescription: note ? `照片记录了：${note}` : "一张日常照片。",
    activities: note ? ["随手记录"] : ["生活记录"],
    emotion: note?.match(/开心|快乐|高兴|兴奋/) ? "开心" : "温柔",
    tags,
    story_value: "这条记录会在报告里成为一个小坐标，提醒你生活并不是空白地滑过去。"
  });
}

function localFallbackReport(records: SerializedRecord[], year: number, month?: number): StructuredReport {
  const periodName = month ? `${year} 年 ${month} 月` : `${year} 年`;
  const coverImage = records[0]?.imagePath || "";
  const images = records.map((r) => r.imagePath);

  return {
    themeName: periodName,
    subtitle: "由日常照片和只言片语编织而成",
    title: `${periodName}懒得记`,
    coverImage,
    prologue: `${periodName}，你留下了 ${records.length} 个生活切片。它们有的热闹，有的安静，但共同把这一段日子折成了可以回看的形状。`,
    keywords: records.flatMap((r) => r.tags).slice(0, 7),
    stats: {
      totalRecords: records.length,
      activeDays: new Set(records.map((r) => r.capturedAt.slice(0, 10))).size,
      topLocations: records.map((r) => r.location).filter(Boolean).slice(0, 5) as string[],
      topActivities: records.flatMap((r) => r.activities).slice(0, 5),
      topEmotions: records.map((r) => r.emotion).filter(Boolean).slice(0, 3) as string[]
    },
    yearNarrative: [
      {
        title: "被记录下来的日子",
        text: `${periodName}，你留下了 ${records.length} 条记录。每一条都是你选择按下快门、写下文字的时刻。这些痕迹告诉未来的你：这一年，不是空白地滑过去的。`
      }
    ],
    featureSections: [
      {
        title: "日常切片",
        subtitle: "那些看似普通却被你留下来的瞬间",
        text: "生活里最容易被忘记的，往往是最真实的。这些照片和文字，帮你把那些平凡的日子钉在了时间里。",
        tags: ["日常", "生活"],
        images: images.slice(0, 4)
      }
    ],
    moments: records.slice(0, 9).map((record) => ({
      title: record.aiSummary || record.userNote || "一个被记住的瞬间",
      date: record.capturedAt.slice(0, 10),
      text: record.storyValue || record.imageDescription || "这张照片把一个瞬间留了下来。",
      image: record.imagePath
    })),
    selfPortrait: `这一年的你，用 ${records.length} 条记录对抗遗忘。你喜欢记录生活里那些细小而真实的瞬间，也会在某个时刻停下来，认真地回顾。`,
    closing: "愿你下一次回看时，不只是想起发生了什么，也想起当时的自己多么具体。"
  };
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
    const errorBody = await response.text().catch(() => "");
    throw new Error(`LLM request failed with status ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function analyzeImage(imageFilePath: string, userNote?: string | null): Promise<AiRecordInsight> {
  const config = getApiConfig();
  if (!config.apiKey) {
    console.warn("LLM_API_KEY/OPENAI_API_KEY is missing. Using local fallback insight.");
    return localFallbackInsight(userNote);
  }

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
          content: IMAGE_ANALYSIS_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "请基于图片内容做画面分析，只输出一句中文，20 到 40 字。\n如果补充信息存在，只作为上下文参考，不要复述。\n\n补充信息：\n用户文字：" +
                (userNote || "无") +
                "\n\n然后另起一行输出 JSON：{\"summary\":\"30字以内的概括\",\"tags\":[\"标签1\",\"标签2\"],\"emotion\":\"情绪\",\"location\":\"地点\"}\n不要输出 markdown 代码块，不要解释。"
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

    const lines = content.split("\n").filter(Boolean);
    const imageDescription = lines[0]?.trim() || "";

    const jsonStr = lines.slice(1).join("\n");
    const parsed = extractJson(jsonStr) || extractJson(content);
    if (!parsed) {
      console.warn("Vision model returned non-JSON content. Using image description fallback.", content.slice(0, 500));
    }

    return coerceInsight({
      ...parsed,
      imageDescription: imageDescription || parsed?.summary || ""
    });
  } catch (error) {
    console.error("Vision analysis failed. Using local fallback insight.", error);
    return localFallbackInsight(userNote);
  }
}

export async function generateStructuredReport(
  records: SerializedRecord[],
  year: number,
  month?: number
): Promise<StructuredReport> {
  const config = getApiConfig();
  if (!config.apiKey || records.length === 0) {
    return localFallbackReport(records, year, month);
  }

  try {
    const items = records.map((record) => ({
      id: record.id,
      imageUrl: record.imagePath,
      description: record.userNote || "",
      date: record.capturedAt.slice(0, 10),
      analysis: {
        summary: record.aiSummary || "",
        location: record.location || "",
        people: record.people,
        activities: record.activities,
        food: record.food,
        objects: record.objects,
        emotion: record.emotion || "",
        tags: record.tags,
        story_value: record.storyValue || record.imageDescription || ""
      }
    }));

    const periodName = month ? `${year} 年 ${month} 月` : `${year} 年`;

    const userPrompt = `以下是用户在 ${periodName} 的所有生活记录，请根据这些记录生成年度回顾报告：

${JSON.stringify(items, null, 2)}

请严格按照系统提示词中的要求，分析并输出 JSON。`;

    const content = await callChatCompletions({
      model: config.textModel,
      temperature: config.textTemperature,
      max_tokens: Math.max(config.maxTokens, 3000),
      messages: [
        {
          role: "system",
          content: `${REPORT_SYSTEM_PROMPT}\n\n${OUTPUT_SCHEMA_HINT}`
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const parsed = extractStructuredJson(content);
    if (parsed) return parsed;

    console.warn("Report model returned non-JSON content. Using local fallback report.", content.slice(0, 500));
    return localFallbackReport(records, year, month);
  } catch (error) {
    console.error("Structured report generation failed. Using local fallback report.", error);
    return localFallbackReport(records, year, month);
  }
}

export { localFallbackReport, getApiConfig };
