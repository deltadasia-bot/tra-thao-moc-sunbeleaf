import { BACKEND_URL } from "@/constants/api";

export interface ZaloOfficialAccountStats {
  followerCount: number;
  oaName: string | null;
  updatedAt: string;
  cached: boolean;
}

export async function getZaloOfficialAccountStats(): Promise<ZaloOfficialAccountStats | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/zalo-oa/stats`);
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    if (typeof data?.followerCount !== "number") {
      return null;
    }

    return {
      followerCount: data.followerCount,
      oaName: typeof data?.oaName === "string" ? data.oaName : null,
      updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
      cached: Boolean(data?.cached),
    };
  } catch (error) {
    console.warn("[zalo-oa] Khong the lay thong tin follower OA:", error);
    return null;
  }
}
