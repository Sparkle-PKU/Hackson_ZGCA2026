import { writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { ensureUploadDir, safeUploadPath, uploadUrl } from "../src/lib/storage";

const prisma = new PrismaClient();
const year = new Date().getFullYear();

const demo = [
  {
    file: "demo-hotpot.svg",
    title: "热腾腾的火锅夜",
    note: "和朋友吃了热腾腾的火锅，聊到很晚。",
    date: `${year}-01-18`,
    location: "巷口火锅店",
    emotion: "快乐",
    activities: ["朋友聚会", "吃火锅", "夜聊"],
    food: ["火锅", "毛肚", "冰粉"],
    tags: ["朋友", "火锅", "冬天", "快乐"],
    colors: ["#d94b4b", "#f6b36b", "#3f2d2d"]
  },
  {
    file: "demo-train.svg",
    title: "清晨高铁",
    note: "赶早班高铁去参加路演。",
    date: `${year}-03-07`,
    location: "北京南站",
    emotion: "充实",
    activities: ["出差", "坐高铁", "路演"],
    food: ["咖啡"],
    tags: ["交通", "高铁", "工作", "清晨"],
    colors: ["#2f6f8f", "#b7d6df", "#f5c85b"]
  },
  {
    file: "demo-park.svg",
    title: "公园的风",
    note: "下午去公园散步，拍到了很好看的云。",
    date: `${year}-04-12`,
    location: "城市公园",
    emotion: "松弛",
    activities: ["散步", "拍云", "晒太阳"],
    food: ["柠檬茶"],
    tags: ["公园", "云", "春天", "松弛"],
    colors: ["#61b7a8", "#cbe8d4", "#f1d27a"]
  },
  {
    file: "demo-concert.svg",
    title: "音乐响起来的时候",
    note: "晚上看了一场很喜欢的 live。",
    date: `${year}-05-23`,
    location: "Livehouse",
    emotion: "兴奋",
    activities: ["看演出", "拍照", "合唱"],
    food: ["气泡水"],
    tags: ["音乐", "演出", "夜晚", "兴奋"],
    colors: ["#241f21", "#e46d9c", "#7d6cf1"]
  },
  {
    file: "demo-cafe.svg",
    title: "咖啡馆写完计划",
    note: "在咖啡馆把项目计划写完了。",
    date: `${year}-07-09`,
    location: "街角咖啡馆",
    emotion: "有成就感",
    activities: ["写计划", "喝咖啡", "独处"],
    food: ["拿铁", "可颂"],
    tags: ["咖啡", "项目", "独处", "成就"],
    colors: ["#8a5a44", "#f4d8b5", "#284b43"]
  },
  {
    file: "demo-sea.svg",
    title: "去海边吹风",
    note: "周末坐车去了海边，傍晚的风很舒服。",
    date: `${year}-08-16`,
    location: "海边栈道",
    emotion: "浪漫",
    activities: ["旅行", "看海", "散步"],
    food: ["海鲜面"],
    tags: ["海边", "旅行", "傍晚", "浪漫"],
    colors: ["#2b79a3", "#f5c85b", "#f7f3ed"]
  },
  {
    file: "demo-family.svg",
    title: "家里的生日蛋糕",
    note: "给家人过生日，拍了很多照片。",
    date: `${year}-10-02`,
    location: "家",
    emotion: "温暖",
    activities: ["生日", "家庭聚餐", "拍照"],
    food: ["蛋糕", "长寿面"],
    tags: ["家人", "生日", "蛋糕", "温暖"],
    colors: ["#f7b7c8", "#fff1a8", "#583d5a"]
  },
  {
    file: "demo-award.svg",
    title: "一个小小里程碑",
    note: "项目拿到了阶段性成果，大家一起庆祝。",
    date: `${year}-11-20`,
    location: "办公室",
    emotion: "骄傲",
    activities: ["项目复盘", "庆祝", "合影"],
    food: ["披萨", "奶茶"],
    tags: ["成就", "团队", "庆祝", "里程碑"],
    colors: ["#241f21", "#f5c85b", "#61b7a8"]
  }
];

function svg(title: string, colors: string[]) {
  const [a, b, c] = colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="0.55" stop-color="${b}"/>
      <stop offset="1" stop-color="${c}"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.18"/></feComponentTransfer>
      <feBlend mode="multiply" in2="SourceGraphic"/>
    </filter>
  </defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  <circle cx="210" cy="180" r="150" fill="#fff" opacity="0.2"/>
  <circle cx="980" cy="690" r="210" fill="#fff" opacity="0.18"/>
  <path d="M80 680 C230 560 340 760 510 610 S820 470 1120 610" fill="none" stroke="#fff" stroke-width="24" opacity="0.4"/>
  <rect x="94" y="92" width="1012" height="716" rx="28" fill="none" stroke="#fff" stroke-width="10" opacity="0.7"/>
  <text x="105" y="790" fill="#fff" font-family="Microsoft YaHei, sans-serif" font-size="62" font-weight="800">${title}</text>
  <rect width="1200" height="900" filter="url(#grain)" opacity="0.22"/>
</svg>`;
}

async function main() {
  await ensureUploadDir();
  await prisma.report.deleteMany();
  await prisma.record.deleteMany();

  for (const item of demo) {
    await writeFile(safeUploadPath(item.file), svg(item.title, item.colors), "utf8");
    await prisma.record.create({
      data: {
        imagePath: uploadUrl(item.file),
        originalName: item.file,
        userNote: item.note,
        capturedAt: new Date(item.date),
        aiStatus: "done",
        aiSummary: item.title,
        location: item.location,
        people: JSON.stringify(item.activities.includes("家庭聚餐") ? ["家人"] : item.activities.includes("朋友聚会") ? ["朋友"] : []),
        activities: JSON.stringify(item.activities),
        food: JSON.stringify(item.food),
        objects: JSON.stringify(["照片", "手机"]),
        transport: JSON.stringify(item.tags.includes("高铁") ? ["高铁"] : item.tags.includes("旅行") ? ["汽车"] : []),
        emotion: item.emotion,
        tags: JSON.stringify(item.tags),
        storyValue: `这一天的关键词是${item.tags.slice(0, 2).join("和")}，它让普通日子变得更有记忆点。`,
        rawAi: JSON.stringify({ demo: true })
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
