import { BACKEND_URL } from "@/constants/api";

export interface ZaloOfficialAccountStats {
  followerCount: number;
  oaName: string | null;
  updatedAt: string;
  cached: boolean;
  error?: string | null;
}

export async function getZaloOfficialAccountStats(): Promise<ZaloOfficialAccountStats | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/zalo-oa/stats`);
    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    
    return {
      followerCount: typeof data?.followerCount === "number" ? data.followerCount : -1,
      oaName: typeof data?.oaName === "string" ? data.oaName : null,
      updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
      cached: Boolean(data?.cached),
      error: typeof data?.error === "string" ? data.error : null,
    };
  } catch (error) {
    console.warn("[zalo-oa] Khong the lay thong tin follower OA:", error);
    return {
      followerCount: -1,
      oaName: null,
      updatedAt: "",
      cached: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
