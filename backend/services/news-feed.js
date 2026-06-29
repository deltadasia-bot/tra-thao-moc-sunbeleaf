const { XMLParser } = require("fast-xml-parser");

const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

const FEED_SOURCES = [
  {
    id: "skds-herbal",
    source: "Sức khỏe & Đời sống",
    sourceKey: "skds",
    feedUrl: "https://suckhoedoisong.vn/rss/suc-khoe.rss",
    logoUrl: "https://static.mediacdn.vn/suckhoedoisong/image/logo.svg",
  },
  {
    id: "vnexpress-health",
    source: "VnExpress Sức khỏe",
    sourceKey: "vnexpress",
    feedUrl: "https://vnexpress.net/rss/suc-khoe.rss",
    logoUrl:
      "https://s1.vnecdn.net/vnexpress/restruct/i/v9854/v2_2019/pc/graphics/logo.svg",
  },
  {
    id: "thanhnien-health",
    source: "Thanh Niên",
    sourceKey: "thanhnien",
    feedUrl: "https://thanhnien.vn/rss/suc-khoe.rss",
    logoUrl: "https://static.thanhnien.com.vn/thanhnien.vn/image/logo.svg",
  },
  {
    id: "tuoitre-health",
    source: "Tuổi Trẻ Online",
    sourceKey: "tuoitre",
    feedUrl: "https://tuoitre.vn/rss/suc-khoe.rss",
    logoUrl:
      "https://static-tuoitre.tuoitre.vn/tuoitre/web_images/tto_default_avatar_2.png",
  },
  {
    id: "nld-health",
    source: "Người Lao Động",
    sourceKey: "nld",
    feedUrl: "https://nld.com.vn/rss/suc-khoe.rss",
    logoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/da/Ng%C6%B0%E1%BB%9Di_lao_%C4%91%E1%BB%99ng_logo.svg",
  },
];

const HERBAL_KEYWORDS = [
  "tra",
  "thao moc",
  "thao duoc",
  "duoc lieu",
  "hoa cuc",
  "atiso",
  "xa den",
  "la dua",
  "gung",
  "sen",
  "cam thao",
  "nhan sam",
  "linh chi",
  "tam that",
  "dinh lang",
  "duong sinh",
  "dong y",
];

const SAFETY_KEYWORDS = [
  "luu y",
  "canh bao",
  "tac dung phu",
  "nguy co",
  "khong nen",
  "sai lam",
  "chong chi dinh",
  "ngo doc",
  "qua lieu",
  "tham khao bac si",
];

const HEALTH_KEYWORDS = [
  "suc khoe",
  "cham soc",
  "dinh duong",
  "giac ngu",
  "giam can",
  "thanh loc",
  "gan",
  "tieu hoa",
  "mien dich",
  "tim mach",
  "huyet ap",
  "duong huyet",
  "stress",
  "mat ngu",
  "song khoe",
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: false,
});

let cache = {
  updatedAt: 0,
  items: [],
};

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function decodeHtml(input) {
  return String(input || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeVietnamese(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

function includesAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function categorizeArticle(text) {
  if (includesAnyKeyword(text, SAFETY_KEYWORDS)) {
    return "safety";
  }
  if (includesAnyKeyword(text, HERBAL_KEYWORDS)) {
    return "herbal";
  }
  return "health";
}

function isRelevantArticle(text) {
  return (
    includesAnyKeyword(text, HERBAL_KEYWORDS) ||
    includesAnyKeyword(text, HEALTH_KEYWORDS) ||
    includesAnyKeyword(text, SAFETY_KEYWORDS)
  );
}

function extractImageUrl(item) {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  const mediaContent = ensureArray(item["media:content"]);
  const mediaThumbnail = ensureArray(item["media:thumbnail"]);

  const firstMediaContent = mediaContent.find((entry) => entry?.url);
  if (firstMediaContent?.url) {
    return firstMediaContent.url;
  }

  const firstMediaThumbnail = mediaThumbnail.find((entry) => entry?.url);
  if (firstMediaThumbnail?.url) {
    return firstMediaThumbnail.url;
  }

  const description = String(item.description || item["content:encoded"] || "");
  const match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

function formatSummary(...sources) {
  const merged = decodeHtml(sources.filter(Boolean).join(" "));
  if (!merged) return "Bài viết mới từ nguồn báo chính thống về thảo mộc, thảo dược và chăm sóc sức khỏe.";
  return merged.length > 180 ? `${merged.slice(0, 177).trim()}...` : merged;
}

function toTimestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function fetchFeed(source) {
  const response = await fetch(source.feedUrl, {
    headers: {
      "User-Agent": "SunBeleafNewsBot/1.0 (+https://deltadasia.com)",
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed ${source.source} trả về ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  const items = ensureArray(channel?.item);

  return items
    .map((item, index) => {
      const title = decodeHtml(item.title || "");
      const summary = formatSummary(item.description, item["content:encoded"]);
      const url = String(item.link || "").trim();
      const normalizedText = normalizeVietnamese(`${title} ${summary}`);

      if (!title || !url || !isRelevantArticle(normalizedText)) {
        return null;
      }

      return {
        id: `${source.id}-${toTimestamp(item.pubDate || item.isoDate || Date.now())}-${index}`,
        title,
        source: source.source,
        sourceKey: source.sourceKey,
        logoUrl: source.logoUrl,
        summary,
        category: categorizeArticle(normalizedText),
        url,
        imageUrl: extractImageUrl(item),
        publishedAt:
          item.pubDate || item.isoDate || item.published || new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

async function refreshNewsFeed() {
  const settled = await Promise.allSettled(FEED_SOURCES.map(fetchFeed));

  const items = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  if (items.length === 0) {
    const failedSources = settled
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message || "Unknown error");
    throw new Error(
      `Không thể cập nhật nguồn tin tự động. ${failedSources.join(" | ")}`.trim(),
    );
  }

  const deduped = [];
  const seen = new Set();

  for (const item of items.sort(
    (a, b) => toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt),
  )) {
    const dedupeKey = `${normalizeVietnamese(item.title)}|${item.url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduped.push(item);
  }

  cache = {
    updatedAt: Date.now(),
    items: deduped.slice(0, 24),
  };

  return cache;
}

async function getNewsFeed({ forceRefresh = false } = {}) {
  const isFresh =
    !forceRefresh &&
    cache.items.length > 0 &&
    Date.now() - cache.updatedAt < NEWS_CACHE_TTL_MS;

  if (isFresh) {
    return {
      items: cache.items,
      updatedAt: new Date(cache.updatedAt).toISOString(),
      cached: true,
    };
  }

  const next = await refreshNewsFeed();
  return {
    items: next.items,
    updatedAt: new Date(next.updatedAt).toISOString(),
    cached: false,
  };
}

module.exports = {
  getNewsFeed,
};
