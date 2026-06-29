import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Text } from "zmp-ui";
import { copy } from "@/constants/copy";
import { CloseIcon, MapPinIcon, MapPinIconSolid } from "@/components/common/vectors";
import { authorize, showToast } from "zmp-sdk/apis";
import { BACKEND_URL } from "@/constants/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";



interface Location {
  id: string;
  name: string;
  address: string;
  distance?: string;
  lat: number;
  lng: number;
}

interface GeoapifyFeature {
  properties: {
    place_id?: string;
    formatted: string;
    address_line1?: string;
    lat: number;
    lon: number;
  };
}

interface GeoapifyResponse {
  features?: GeoapifyFeature[];
}

const SELECTED_DELIVERY_LOCATION_KEY = "selectedDeliveryLocation";
const ADDRESS_HISTORY_KEY = "deliveryAddressHistory";
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const SERPAPI_API_KEY = import.meta.env.VITE_SERPAPI_API_KEY;
const HO_CHI_MINH_CITY_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
};

const getAddressHistory = (): Location[] => {
  try {
    const data = localStorage.getItem(ADDRESS_HISTORY_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3);
      }
    }
  } catch (e) {
    console.error("[History] Lỗi đọc lịch sử địa chỉ:", e);
  }
  return [];
};

const saveAddressToHistory = (loc: Location) => {
  try {
    const history = getAddressHistory();
    const filtered = history.filter((item) => {
      if (item.id === loc.id) return false;
      const latDiff = Math.abs(item.lat - loc.lat);
      const lngDiff = Math.abs(item.lng - loc.lng);
      if (latDiff < 0.0001 && lngDiff < 0.0001) return false;
      if (
        item.name.toLowerCase() === loc.name.toLowerCase() &&
        item.address.toLowerCase() === loc.address.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
    const newHistory = [loc, ...filtered].slice(0, 3);
    localStorage.setItem(ADDRESS_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("[History] Lỗi lưu lịch sử địa chỉ:", e);
  }
};


const LOCATIONS: Location[] = [
  {
    id: "1",
    name: "KDC Jamona - Art Gallery",
    address: "02-03a KCN trong KCX, Tân Thuận Đông",
    distance: "6,7km",
    lat: 10.741895,
    lng: 106.733889,
  },
  {
    id: "2",
    name: "CÔNG TY TNHH KDC Jamona",
    address: "504 Huỳnh Tấn Phát, Bình Thuận, Quận 7, Hồ Chí Minh",
    distance: "12,2km",
    lat: 10.747148,
    lng: 106.724384,
  },
  {
    id: "3",
    name: "KDC Jamona Vietnam",
    address: "Đường Số 5, Khu đô thị Him Lam, Quận 7, Hồ Chí Minh",
    distance: "18,5km",
    lat: 10.740962,
    lng: 106.702913,
  },
];

const getGoogleMapUrl = (location: Location) => {
  const query = encodeURIComponent(`${location.name}, ${location.address}`);
  return `https://www.google.com/maps?q=${query}&ll=${location.lat},${location.lng}&z=16&output=embed`;
};

const getLocationName = (feature: GeoapifyFeature) =>
  feature.properties.address_line1 ||
  feature.properties.formatted.split(",")[0]?.trim() ||
  "Địa điểm đã chọn";

const toLocation = (feature: GeoapifyFeature): Location => ({
  id: feature.properties.place_id || feature.properties.formatted,
  name: getLocationName(feature),
  address: feature.properties.formatted,
  lat: feature.properties.lat,
  lng: feature.properties.lon,
});

const getGpsPosition = (enableHighAccuracy: boolean, timeout: number): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy,
        maximumAge: 30000,
        timeout,
      }
    );
  });
};

const getUserBiasLocation = async (): Promise<{ lat: number; lng: number; isGps?: boolean }> => {
  if (!navigator.geolocation) {
    return { ...HO_CHI_MINH_CITY_CENTER, isGps: false };
  }

  // 1. Thử lấy định vị GPS chính xác cao
  try {
    const coords = await getGpsPosition(true, 8000);
    return { ...coords, isGps: true };
  } catch (err: any) {
    console.warn("[GPS] Lấy định vị GPS độ chính xác cao thất bại:", err);

    // Nếu bị chặn quyền định vị (PERMISSION_DENIED), yêu cầu cấp quyền Zalo native
    if (err && err.code === 1) { // 1 = PERMISSION_DENIED
      try {
        await new Promise<void>((resolveAuth, rejectAuth) => {
          authorize({
            scopes: ["scope.userLocation"],
            success: () => resolveAuth(),
            fail: (e) => rejectAuth(e),
          });
        });
        // Sau khi người dùng cấp quyền, lấy lại GPS độ chính xác cao
        const coords = await getGpsPosition(true, 8000);
        return { ...coords, isGps: true };
      } catch (authErr) {
        console.warn("[ZMP SDK] Không được cấp quyền định vị Zalo:", authErr);
      }
    }

    // 2. Dự phòng lấy định vị thông thường
    try {
      const coords = await getGpsPosition(false, 5000);
      return { ...coords, isGps: true };
    } catch (fallbackErr) {
      console.error("[GPS] Tất cả phương thức định vị đều thất bại:", fallbackErr);
      return { ...HO_CHI_MINH_CITY_CENTER, isGps: false };
    }
  }
};

const cleanAlleyAddress = (q: string): string => {
  return q.replace(/(\d+[A-Za-z]?)(?:\/\d+[A-Za-z]?)+/g, "$1");
};

const reverseGeocodeAddress = async (
  lat: number,
  lng: number
): Promise<Location | null> => {
  // 1. Dùng Google Maps Reverse Geocoding (nếu có API Key cấu hình)
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY,
        language: "vi",
      });
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const result = data.results[0];
          return {
            id: `gps-google-${Date.now()}`,
            name: "Vị trí hiện tại của bạn",
            address: result.formatted_address,
            lat,
            lng,
          };
        }
      }
    } catch (err) {
      console.error("[Geocoding] Lỗi Google Maps Reverse Geocoding:", err);
    }
  }

  // 2. Dùng OpenStreetMap Nominatim Reverse Geocoding (không cần key, tối ưu tốt)
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: "json",
      "accept-language": "vi",
    });
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": "SunbeleafZaloMiniApp/1.0 (contact@sunbeleaf.com)",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data.display_name) {
        return {
          id: `gps-osm-${Date.now()}`,
          name: "Vị trí hiện tại của bạn",
          address: data.display_name,
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    console.error("[Geocoding] Lỗi OSM Nominatim Reverse Geocoding:", err);
  }

  // 3. Dự phòng bằng Geoapify Reverse Geocoding
  if (GEOAPIFY_API_KEY) {
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        apiKey: GEOAPIFY_API_KEY,
        lang: "vi",
      });
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          return {
            id: `gps-geoapify-${Date.now()}`,
            name: "Vị trí hiện tại của bạn",
            address: feature.properties.formatted,
            lat,
            lng,
          };
        }
      }
    } catch (err) {
      console.error("[Geocoding] Lỗi Geoapify Reverse Geocoding:", err);
    }
  }

  // 4. Trả về tọa độ thuần nếu các dịch vụ giải mã địa chỉ đều thất bại
  return {
    id: `gps-fallback-${Date.now()}`,
    name: "Vị trí hiện tại",
    address: `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
  };
};

const parseSerpApiGeocodeData = (data: any) => {
  if (!data || data.error) return null;
  
  if (data.place_results && data.place_results.gps_coordinates) {
    const item = data.place_results;
    return {
      name: item.title,
      address: item.address || item.title,
      lat: item.gps_coordinates.latitude,
      lng: item.gps_coordinates.longitude,
    };
  }

  if (data.local_results && Array.isArray(data.local_results) && data.local_results.length > 0) {
    const item = data.local_results[0];
    if (item.gps_coordinates) {
      return {
        name: item.title,
        address: item.address || item.title,
        lat: item.gps_coordinates.latitude,
        lng: item.gps_coordinates.longitude,
      };
    }
  }

  return null;
};

const geocodeAddressWithSerpApi = async (
  address: string,
  bias: { lat: number; lng: number }
): Promise<{ lat: number; lng: number; address: string; name: string } | null> => {
  // 1. Thử gọi qua backend proxy trước
  try {
    const params = new URLSearchParams({
      address: address,
      lat: String(bias.lat),
      lng: String(bias.lng),
    });
    const url = `${BACKEND_URL}/api/geocode?${params.toString()}`;
    console.log("[Geocoding SerpApi] Gọi backend geocode:", url);
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const resolved = parseSerpApiGeocodeData(data);
      if (resolved) {
        console.log("[Geocoding SerpApi] Giải mã qua backend thành công:", resolved);
        return resolved;
      }
    } else {
      console.warn("[Geocoding SerpApi] Backend trả về lỗi:", response.status);
    }
  } catch (err) {
    console.warn("[Geocoding SerpApi] Lỗi gọi backend geocode proxy:", err);
  }

  // 2. Dự phòng: Thử trực tiếp qua allorigins CORS proxy nếu có key cấu hình ở client
  if (SERPAPI_API_KEY) {
    try {
      const params = new URLSearchParams({
        engine: "google_maps",
        q: address,
        api_key: SERPAPI_API_KEY,
        ll: `@${bias.lat},${bias.lng},14z`,
        type: "search",
        hl: "vi",
      });
      const targetUrl = `https://serpapi.com/search.json?${params.toString()}`;
      const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      console.log("[Geocoding SerpApi] Gọi client-side proxy fallback:", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const resolved = parseSerpApiGeocodeData(data);
        if (resolved) {
          console.log("[Geocoding SerpApi] Giải mã qua client-side proxy thành công:", resolved);
          return resolved;
        }
      }
    } catch (err) {
      console.warn("[Geocoding SerpApi] Lỗi gọi client CORS proxy:", err);
    }
  }

  return null;
};

const geocodeAddressWithFallbackAPIs = async (
  address: string,
  bias: { lat: number; lng: number }
): Promise<{ lat: number; lng: number; address: string; name: string } | null> => {
  // 1. Thử qua Nominatim (OSM)
  try {
    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      countrycodes: "vn",
      "accept-language": "vi",
      viewbox: `${bias.lng - 0.5},${bias.lat + 0.5},${bias.lng + 0.5},${bias.lat - 0.5}`,
    });
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
    console.log("[Geocoding Fallback] Thử Nominatim OSM:", url);
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "vi-VN,vi;q=0.9",
        "User-Agent": "SunbeleafZaloMiniApp/1.0 (contact@sunbeleaf.com)",
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const resolved = {
          name: item.name || item.display_name.split(",")[0]?.trim() || "Địa chỉ tự điền",
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
        console.log("[Geocoding Fallback] Giải mã qua Nominatim thành công:", resolved);
        return resolved;
      }
    }
  } catch (err) {
    console.warn("[Geocoding Fallback] Lỗi OSM Nominatim:", err);
  }

  // 2. Thử qua Geoapify
  if (GEOAPIFY_API_KEY) {
    try {
      const params = new URLSearchParams({
        text: address,
        apiKey: GEOAPIFY_API_KEY,
        filter: "countrycode:vn",
        bias: `proximity:${bias.lng},${bias.lat}`,
        limit: "1",
        lang: "vi",
      });
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;
      console.log("[Geocoding Fallback] Thử Geoapify:", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const item = data.features[0];
          const resolved = {
            name: item.properties.address_line1 || item.properties.formatted.split(",")[0]?.trim() || "Địa chỉ tự điền",
            address: item.properties.formatted,
            lat: item.properties.lat,
            lng: item.properties.lon,
          };
          console.log("[Geocoding Fallback] Giải mã qua Geoapify thành công:", resolved);
          return resolved;
        }
      }
    } catch (err) {
      console.warn("[Geocoding Fallback] Lỗi Geoapify:", err);
    }
  }

  return null;
};


const searchCombinedAddresses = async (
  query: string,
  biasLocation: { lat: number; lng: number },
  signal: AbortSignal,
): Promise<Location[]> => {
  const executeSearch = async (searchTerm: string): Promise<Location[]> => {
    const promises: Promise<Location[]>[] = [];

    // 1. Tìm qua Google Maps Geocoding API (nếu có Key) - cho độ chính xác tuyệt đối như Google Map/Apple Map
    if (GOOGLE_MAPS_API_KEY) {
      const googlePromise = (async () => {
        try {
          const params = new URLSearchParams({
            address: searchTerm,
            key: GOOGLE_MAPS_API_KEY,
            language: "vi",
            components: "country:VN",
          });
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
            { signal },
          );
          if (!response.ok) return [];
          const data = await response.json();
          if (data.status !== "OK" || !data.results) return [];
          return data.results.map((item: any) => ({
            id: `google-${item.place_id}`,
            name: item.formatted_address.split(",")[0]?.trim() || "Địa điểm Google",
            address: item.formatted_address,
            lat: item.geometry.location.lat,
            lng: item.geometry.location.lng,
          }));
        } catch (err) {
          console.error("[Geocoding] Lỗi Google Maps Geocoding:", err);
          return [];
        }
      })();
      promises.push(googlePromise);
    }

    // SerpApi Google Maps search scraper has been removed from autocomplete suggestions to conserve quota
    // and is now exclusively called when confirming a manual/self-filled address.

    // 3. Tìm qua Geoapify Autocomplete API
    if (GEOAPIFY_API_KEY) {
      const geoapifyPromise = (async () => {
        try {
          const params = new URLSearchParams({
            text: searchTerm,
            apiKey: GEOAPIFY_API_KEY,
            filter: "countrycode:vn",
            bias: `proximity:${biasLocation.lng},${biasLocation.lat}`,
            limit: "10",
            lang: "vi",
          });
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
            { signal },
          );
          if (!response.ok) return [];
          const data = (await response.json()) as GeoapifyResponse;
          return (data.features || []).map(toLocation);
        } catch (err) {
          console.error("[Geocoding] Lỗi Geoapify:", err);
          return [];
        }
      })();
      promises.push(geoapifyPromise);
    }

    // 4. Tìm qua OpenStreetMap Nominatim API (Mạnh về hẻm nhỏ và từ địa phương ở Việt Nam)
    const nominatimPromise = (async () => {
      try {
        const params = new URLSearchParams({
          q: searchTerm,
          format: "json",
          limit: "10",
          countrycodes: "vn",
          "accept-language": "vi",
          viewbox: `${biasLocation.lng - 0.5},${biasLocation.lat + 0.5},${biasLocation.lng + 0.5},${biasLocation.lat - 0.5}`,
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            signal,
            headers: {
              "Accept-Language": "vi-VN,vi;q=0.9",
              "User-Agent": "SunbeleafZaloMiniApp/1.0 (contact@sunbeleaf.com)",
            },
          },
        );
        if (!response.ok) return [];
        const data = await response.json();
        if (!Array.isArray(data)) return [];
        return data.map((item: any) => ({
          id: `osm-${item.place_id || item.osm_id}`,
          name: item.name || item.display_name.split(",")[0]?.trim() || "Địa điểm đã chọn",
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
      } catch (err) {
        console.error("[Geocoding] Lỗi OSM Nominatim:", err);
        return [];
      }
    })();
    promises.push(nominatimPromise);

    const resultsList = await Promise.all(promises);
    const rawResults = resultsList.flat();

    // Loại bỏ địa chỉ trùng lặp
    const uniqueResults: Location[] = [];
    const isDuplicate = (loc: Location) => {
      return uniqueResults.some((existing) => {
        const latDiff = Math.abs(existing.lat - loc.lat);
        const lngDiff = Math.abs(existing.lng - loc.lng);
        if (latDiff < 0.001 && lngDiff < 0.001) return true;

        if (
          existing.name.toLowerCase() === loc.name.toLowerCase() &&
          existing.address.toLowerCase().slice(0, 20) === loc.address.toLowerCase().slice(0, 20)
        ) {
          return true;
        }
        return false;
      });
    };

    for (const item of rawResults) {
      if (!isDuplicate(item)) {
        uniqueResults.push(item);
      }
    }

    return uniqueResults;
  };

  // Tạo tập hợp các query để tìm kiếm song song (Địa chỉ gốc đầy đủ hẻm + Địa chỉ đã được rút gọn hẻm phụ)
  const queriesToSearch = [query];
  const cleanedQuery = cleanAlleyAddress(query);
  if (cleanedQuery !== query) {
    queriesToSearch.push(cleanedQuery);
  }

  // Chạy các tác vụ tìm kiếm đồng thời
  const searchPromises = queriesToSearch.map((q) => executeSearch(q));
  const resultsLists = await Promise.all(searchPromises);

  const exactResults = resultsLists[0] || [];
  const fallbackResults = resultsLists[1] || [];

  // Hợp nhất kết quả, ưu tiên các kết quả tìm thấy chính xác theo địa chỉ hẻm gốc trước
  const mergedResults = [...exactResults];
  const isDuplicateInMerged = (loc: Location) => {
    return mergedResults.some((existing) => {
      const latDiff = Math.abs(existing.lat - loc.lat);
      const lngDiff = Math.abs(existing.lng - loc.lng);
      return latDiff < 0.001 && lngDiff < 0.001;
    });
  };

  for (const item of fallbackResults) {
    if (!isDuplicateInMerged(item)) {
      mergedResults.push(item);
    }
  }

  // Sắp xếp các kết quả theo thứ tự khoảng cách địa lý tăng dần so với vị trí hiện tại (biasLocation)
  // để ưu tiên hiển thị địa chỉ cùng thành phố/quận huyện thay vì các kết quả ở tỉnh thành xa.
  const getDistanceSq = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dy = lat1 - lat2;
    const dx = lon1 - lon2;
    return dy * dy + dx * dx;
  };

  const sortedResults = [...mergedResults].sort((a, b) => {
    const distA = getDistanceSq(a.lat, a.lng, biasLocation.lat, biasLocation.lng);
    const distB = getDistanceSq(b.lat, b.lng, biasLocation.lat, biasLocation.lng);
    return distA - distB;
  });

  // Nếu tìm thấy địa chỉ (cho dù thông qua địa chỉ rút gọn/dự phòng), tạo đề xuất ghim địa chỉ hẻm gõ đầy đủ lên hàng đầu
  if (sortedResults.length > 0 && query.includes("/")) {
    const closest = sortedResults[0];
    const hasExactQuery = sortedResults.some(
      (r) =>
        r.address.toLowerCase().includes(query.toLowerCase()) ||
        r.name.toLowerCase().includes(query.toLowerCase())
    );

    if (!hasExactQuery) {
      sortedResults.unshift({
        id: `custom-typed-${Date.now()}`,
        name: `Giao đến: ${query}`,
        address: `${query} (Định vị gần: ${closest.name})`,
        lat: closest.lat,
        lng: closest.lng,
      });
    }
  }

  return sortedResults.slice(0, 7);
};

const getHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const R = 6371; // Bán kính Trái Đất tính bằng km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
};

const COMMON_ENGLISH_WORDS = new Set([
  "art", "gallery", "bistro", "plaza", "building", "tower", "mall", "apartment", 
  "floor", "room", "block", "street", "road", "ward", "district", "city", "office", 
  "hotel", "restaurant", "shop", "store", "center", "house", "home", "villa", "campus",
  "residence", "residences", "garden", "gardens", "park", "green", "lake", "river", "sea",
  "ocean", "sky", "town", "village", "hub", "zone", "industrial", "port", "airport",
  "station", "homestay", "spa", "clinic", "coffee", "tea", "cafe", "milktea", "food",
  "mart", "minimart", "supermarket", "boutique", "fashion", "beauty", "salon", "gym",
  "fitness", "club", "bar", "pub", "lounge", "cinema", "theatre", "school", "academy",
  "university", "college", "hospital", "dental", "pharmacy", "bank", "atm", "express",
  "logistic", "logistics", "post", "delivery", "kiosk", "kios", "view", "corner", "market",
  "land", "grand", "central", "golden", "silver", "diamond", "ruby", "emerald", "pearl",
  "royal", "imperial", "star", "sun", "moon", "wind", "cloud", "rain", "light", "dark",
  "smart", "eco", "safe", "clean", "fresh", "sweet", "happy", "lucky", "hope", "love",
  "dream", "peace", "joy", "smile", "friend", "family", "life", "style", "design", "artistic",
  "circle", "eleven", "seven", "mini", "stop", "ministop"
]);

const COMMON_ABBREVIATIONS = new Set([
  "tp", "hcm", "hn", "q", "p", "h", "tx", "tt", "dg", "kdc", "kcn", "kcx", "kdt", "bd", "tphcm",
  "kp", "ql", "tl", "hl", "dt", "cc", "ktt", "vp", "vphc", "vsip", "ubnd", "hdnd", "ca", "ch", "dl"
]);

const COMMON_PROPER_NOUNS = new Set([
  "jamona", "sunbeleaf", "vincom", "vinhomes", "sala", "vng", "fpt", "coop", "lotte", "aeon", "bigc", "go",
  "mega", "metro", "giga", "emart", "winmart", "win", "circle", "eleven", "familymart", "ministop", "gs25",
  "satra", "satramart", "hapro", "intimex", "vietcombank", "vietinbank", "bidv", "agribank", "techcombank",
  "mbbank", "vpbank", "sacombank", "acb", "shb", "hdbank", "tpbank", "vib", "msb", "seabank", "ocb", "bacabank",
  "vietbank", "kienlongbank", "namabank", "saigonbank", "pvcombank", "lienvietpostbank", "lpbank", "shinhan",
  "wori", "hsbc", "scb", "standard", "chartered", "citi", "cib", "anz", "uob", "grab", "be", "gojek", "shopee",
  "lazada", "tiki", "sendo", "tiktok", "momo", "zalopay", "zalo", "viettelpay", "viettel", "vnpt", "mobifone",
  "vinaphone"
]);

const stripAccents = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
};

const VN_SYLLABLE_REGEX = /^(ch|nh|ngh|ng|gh|gi|kh|ph|th|tr|qu|[bcdđghklmnpqrstuvxy])?(a|ae|ai|ao|au|ay|e|ee|ei|eo|eu|ey|i|ia|ie|io|iu|o|oa|oae|oai|oao|oay|oe|oeo|oi|oo|ou|ow|u|ua|uai|uay|uây|ue|ueo|ui|uoi|uo|uou|uow|uu|uy|uya|uye|uyeo|uyt|uyn|uyu|y|ye|yeu)(c|ch|m|n|ng|nh|p|t)?$/i;

const validateWord = (rawWord: string): boolean => {
  const word = rawWord.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()\[\]?"]+|[.,\/#!$%\^&\*;:{}=\-_`~()\[\]?"]+$/g, "");
  if (!word) return true;
  if (/[0-9]/.test(word)) return true;

  const normalized = stripAccents(word);
  if (COMMON_ABBREVIATIONS.has(normalized)) return true;
  if (COMMON_ENGLISH_WORDS.has(normalized)) return true;
  if (COMMON_PROPER_NOUNS.has(normalized)) return true;

  return VN_SYLLABLE_REGEX.test(normalized);
};

const validateAddressText = (address: string): { valid: boolean; reason?: string } => {
  if (!address || address.trim().length < 8) {
    return { valid: false, reason: "Địa chỉ quá ngắn, vui lòng nhập chi tiết số nhà, tên đường, phường xã." };
  }

  const words = address.trim().split(/\s+/);
  const invalidWords: string[] = [];

  for (const w of words) {
    if (!validateWord(w)) {
      invalidWords.push(w);
    }
  }

  if (invalidWords.length > 0) {
    return {
      valid: false,
      reason: `Địa chỉ chứa từ viết sai hoặc không hợp lệ: "${invalidWords.join(", ")}"`
    };
  }

  return { valid: true };
};

export default function SelectLocationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [biasLocation, setBiasLocation] = useState(HO_CHI_MINH_CITY_CENTER);
  const [selectedLocation, setSelectedLocation] = useState<Location>(
    LOCATIONS[0],
  );
  const [addressHistory, setAddressHistory] = useState<Location[]>([]);
  const [currentGpsLocation, setCurrentGpsLocation] = useState<Location | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(true);


  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const localLocations = useMemo(() => {
    // 1. Tính toán khoảng cách thực tế giữa vị trí bias và các địa điểm tĩnh mặc định
    const calculated = LOCATIONS.map((loc) => {
      const dist = getHaversineDistance(
        biasLocation.lat,
        biasLocation.lng,
        loc.lat,
        loc.lng
      );
      return {
        ...loc,
        distance: dist,
      };
    });

    // 2. Lọc theo từ khóa tìm kiếm
    const filtered = calculated.filter(
      (location) =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 3. Nếu ô tìm kiếm trống và đã lấy được định vị GPS, tự động đưa GPS vào vị trí đầu tiên của gợi ý gần nhất
    if (!searchQuery.trim() && currentGpsLocation) {
      const gpsItem = {
        ...currentGpsLocation,
        name: "Vị trí hiện tại của bạn",
        distance: "0m",
      };
      return [gpsItem, ...filtered];
    }

    return filtered;
  }, [searchQuery, biasLocation, currentGpsLocation]);

  const normalizedQuery = searchQuery.trim();
  const shouldShowSearchResults = normalizedQuery.length >= 3;
  const visibleLocations = shouldShowSearchResults
    ? searchResults
    : addressHistory.length > 0
    ? addressHistory
    : localLocations;

  useEffect(() => {
    // Tải lịch sử địa chỉ từ localStorage
    setAddressHistory(getAddressHistory());

    getUserBiasLocation().then(async (coords) => {
      setBiasLocation({ lat: coords.lat, lng: coords.lng });

      if (coords.isGps) {
        setIsSearching(true);
        try {
          const currentLoc = await reverseGeocodeAddress(coords.lat, coords.lng);
          if (currentLoc) {
            setCurrentGpsLocation(currentLoc);
            setSelectedLocation(currentLoc);
            // Giữ ô tìm kiếm trống để hiện lịch sử hoặc gợi ý gần nhất, thay vì điền cứng làm rối input
          }
        } catch (e) {
          console.error("[GPS] Lỗi giải mã địa chỉ vị trí hiện tại:", e);
        } finally {
          setIsSearching(false);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 3) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");

      try {
        const results = await searchCombinedAddresses(
          normalizedQuery,
          biasLocation,
          controller.signal,
        );
        setSearchResults(results);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSearchResults([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Không thể tải gợi ý địa chỉ",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [biasLocation, normalizedQuery]);

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setSearchError("");
  };

  const handleConfirmLocation = () => {
    // Lưu vào lịch sử địa chỉ đã xác nhận
    saveAddressToHistory(selectedLocation);

    const selectedAddress = {
      name: selectedLocation.name,
      address: selectedLocation.address,
      lat: selectedLocation.lat,
      lon: selectedLocation.lng,
    };

    localStorage.setItem(
      SELECTED_DELIVERY_LOCATION_KEY,
      JSON.stringify(selectedAddress),
    );

    navigate("/checkout", { state: { selectedAddress } });
  };

  const resolveManualAddressCoordinates = async (
    rawAddress: string,
    biasLocation: { lat: number; lng: number }
  ): Promise<{ lat: number; lng: number; address?: string; name?: string }> => {
    // 1. Thử giải mã qua SerpApi Google Maps (qua backend proxy hoặc client fallback)
    try {
      const serpResult = await geocodeAddressWithSerpApi(rawAddress, biasLocation);
      if (serpResult) {
        return serpResult;
      }
    } catch (e) {
      console.error("[Geocoding Manual] Không tìm thấy kết quả từ SerpApi:", e);
    }

    // 2. Thử Nominatim / Geoapify dự phòng trực tiếp cho địa chỉ tự điền
    try {
      const fallbackResult = await geocodeAddressWithFallbackAPIs(rawAddress, biasLocation);
      if (fallbackResult) {
        return fallbackResult;
      }
    } catch (e) {
      console.error("[Geocoding Manual] Lỗi Nominatim/Geoapify dự phòng:", e);
    }

    // 3. Dự phòng 3: Tìm kiếm qua Nominatim/Geoapify thường dùng cho danh sách suggestions (nhưng không gọi SerpApi vì đã bỏ)
    try {
      const controller = new AbortController();
      const results = await searchCombinedAddresses(rawAddress, biasLocation, controller.signal);
      if (results && results.length > 0) {
        return { lat: results[0].lat, lng: results[0].lng, address: results[0].address, name: results[0].name };
      }
    } catch (e) {
      console.error("[Geocoding Manual] Lỗi tìm qua searchCombinedAddresses:", e);
    }

    // 4. Dự phòng 4: Thử tìm kiếm theo các thành phần cấp rộng hơn (bỏ phần số nhà/ngõ hẻm đầu tiên)
    const parts = rawAddress.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const subAddress = parts.slice(1).join(", ");
      try {
        const controller = new AbortController();
        const results = await searchCombinedAddresses(subAddress, biasLocation, controller.signal);
        if (results && results.length > 0) {
          return { lat: results[0].lat, lng: results[0].lng, address: results[0].address };
        }
      } catch (e) {
        console.error("[Geocoding SubAddress] Lỗi tìm địa chỉ rút gọn:", e);
      }
    }

    // 5. Nếu vẫn không được, duyệt qua tên các Quận/Huyện của TP.HCM trong văn bản để gán tọa độ trung tâm
    const lowercaseAddr = rawAddress.toLowerCase();
    const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
      "thủ đức": { lat: 10.8494, lng: 106.7729 },
      "thu duc": { lat: 10.8494, lng: 106.7729 },
      "quận 9": { lat: 10.8423, lng: 106.8283 },
      "quan 9": { lat: 10.8423, lng: 106.8283 },
      "quận 2": { lat: 10.7876, lng: 106.7493 },
      "quan 2": { lat: 10.7876, lng: 106.7493 },
      "quận 1": { lat: 10.7760, lng: 106.7015 },
      "quan 1": { lat: 10.7760, lng: 106.7015 },
      "quận 3": { lat: 10.7788, lng: 106.6800 },
      "quan 3": { lat: 10.7788, lng: 106.6800 },
      "quận 4": { lat: 10.7578, lng: 106.7012 },
      "quan 4": { lat: 10.7578, lng: 106.7012 },
      "quận 5": { lat: 10.7544, lng: 106.6634 },
      "quan 5": { lat: 10.7544, lng: 106.6634 },
      "quận 6": { lat: 10.7481, lng: 106.6347 },
      "quan 6": { lat: 10.7481, lng: 106.6347 },
      "quận 7": { lat: 10.7340, lng: 106.7216 },
      "quan 7": { lat: 10.7340, lng: 106.7216 },
      "quận 8": { lat: 10.7232, lng: 106.6601 },
      "quan 8": { lat: 10.7232, lng: 106.6601 },
      "quận 10": { lat: 10.7749, lng: 106.6669 },
      "quan 10": { lat: 10.7749, lng: 106.6669 },
      "quận 11": { lat: 10.7629, lng: 106.6508 },
      "quan 11": { lat: 10.7629, lng: 106.6508 },
      "quận 12": { lat: 10.8671, lng: 106.6415 },
      "quan 12": { lat: 10.8671, lng: 106.6415 },
      "gò vấp": { lat: 10.8388, lng: 106.6660 },
      "go vap": { lat: 10.8388, lng: 106.6660 },
      "bình thạnh": { lat: 10.8106, lng: 106.7091 },
      "binh thanh": { lat: 10.8106, lng: 106.7091 },
      "tân bình": { lat: 10.7966, lng: 106.6427 },
      "tan binh": { lat: 10.7966, lng: 106.6427 },
      "tân phú": { lat: 10.7900, lng: 106.6190 },
      "tan phu": { lat: 10.7900, lng: 106.6190 },
      "bình tân": { lat: 10.7656, lng: 106.5816 },
      "binh tan": { lat: 10.7656, lng: 106.5816 },
      "nhà bè": { lat: 10.6953, lng: 106.7268 },
      "nha be": { lat: 10.6953, lng: 106.7268 },
      "hóc môn": { lat: 10.8833, lng: 106.5925 },
      "hoc mon": { lat: 10.8833, lng: 106.5925 },
      "củ chi": { lat: 11.0069, lng: 106.4984 },
      "cu chi": { lat: 11.0069, lng: 106.4984 },
      "bình chánh": { lat: 10.6874, lng: 106.5939 },
      "binh chanh": { lat: 10.6874, lng: 106.5939 },
      "cần giờ": { lat: 10.5083, lng: 106.8631 },
      "can gio": { lat: 10.5083, lng: 106.8631 },
    };

    for (const [district, coords] of Object.entries(DISTRICT_COORDS)) {
      if (lowercaseAddr.includes(district)) {
        return coords;
      }
    }

    // 6. Mặc định dùng biasLocation nếu không tìm thấy gì khác
    return biasLocation;
  };

  const handleUseManualAddress = async () => {
    const rawAddress = searchQuery.trim();
    const validation = validateAddressText(rawAddress);
    
    if (!validation.valid) {
      showToast({
        message: validation.reason || "Địa chỉ không hợp lệ",
        type: "error",
        duration: 3000,
      } as any);
      return;
    }

    setIsSearching(true);
    showToast({
      message: "Đang định vị địa chỉ...",
      type: "loading",
      duration: 2500,
    } as any);

    let resolved = { lat: biasLocation.lat, lng: biasLocation.lng, address: rawAddress, name: "Địa chỉ tự điền" };

    try {
      const res = await resolveManualAddressCoordinates(rawAddress, biasLocation);
      resolved = {
        lat: res.lat,
        lng: res.lng,
        address: res.address || rawAddress,
        name: res.name || "Địa chỉ tự điền",
      };
    } catch (err) {
      console.error("[Geocoding Manual] Lỗi giải mã địa chỉ tự nhập:", err);
    } finally {
      setIsSearching(false);
    }

    const manualLocation: Location = {
      id: `manual-${Date.now()}`,
      name: resolved.name,
      address: resolved.address,
      lat: resolved.lat,
      lng: resolved.lng,
      distance: "0m",
    };

    // Tính khoảng cách Haversine từ shop để cập nhật trường distance hiển thị
    const shopCoords = { lat: 10.8443, lon: 106.7770 };
    manualLocation.distance = getHaversineDistance(
      shopCoords.lat,
      shopCoords.lon,
      resolved.lat,
      resolved.lng
    );

    // Chọn địa chỉ này (để và cập nhật vị trí ghim của minimap)
    setSelectedLocation(manualLocation);
    showToast({
      message: "Đã xác thực và định vị địa chỉ!",
      type: "success",
      duration: 2000,
    } as any);
  };


  const handleMapTapRef = useRef<any>(null);
  
  const handleMapTap = async (lat: number, lng: number) => {
    setIsSearching(true);
    try {
      const decoded = await reverseGeocodeAddress(lat, lng);
      if (decoded) {
        const mapLocation: Location = {
          ...decoded,
          name: "Vị trí đã ghim",
        };
        setSelectedLocation(mapLocation);
        showToast({
          message: "Đã cập nhật vị trí ghim",
          type: "success",
          duration: 1500,
        } as any);
      }
    } catch (e) {
      console.error("[Map Tap] Lỗi giải mã địa chỉ:", e);
      showToast({
        message: "Không thể xác định địa chỉ tại vị trí này",
        type: "error",
        duration: 2000,
      } as any);
    } finally {
      setIsSearching(false);
    }
  };

  handleMapTapRef.current = handleMapTap;

  // Leaflet is loaded locally via npm import, so CDN loading is not needed.

  // Cập nhật vị trí bản đồ và Marker xem trước
  useEffect(() => {
    const mapElement = mapContainerRef.current;
    if (!mapElement) return;

    const targetCoords: [number, number] = [selectedLocation.lat, selectedLocation.lng];

    if (mapRef.current) {
      // Nếu DOM element chứa map thay đổi (do Zalo Router cache/re-render), hủy instance cũ để khởi tạo lại
      const currentContainer = mapRef.current.getContainer();
      if (currentContainer !== mapElement) {
        console.warn("[Map] DOM container changed, recreating Leaflet instance");
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("[Map] Error removing old Leaflet instance:", e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    }

    if (!mapRef.current) {
      // Khởi tạo bản đồ nếu chưa tồn tại
      const map = L.map(mapElement, {
        zoomControl: false,
        attributionControl: false,
      }).setView(targetCoords, 16);


      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);


      // Đăng ký sự kiện chạm (touch) và click bản đồ phân biệt vuốt/kéo với chạm nhanh
      const container = map.getContainer();
      
      let touchStartTime = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let didMove = false;
      let isMultiTouch = false;
      let lastTouchTime = 0;

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length > 0) {
          touchStartTime = Date.now();
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          didMove = false;
          isMultiTouch = e.touches.length > 1;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          isMultiTouch = true;
        }
        if (e.touches.length > 0) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.sqrt(dx * dx + dy * dy) > 10) {
            didMove = true;
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        const duration = Date.now() - touchStartTime;
        // Chỉ kích hoạt khi chạm và nhả nhanh (< 300ms), không kéo di chuyển (didMove = false), không đa điểm (isMultiTouch = false)
        if (duration < 300 && !didMove && !isMultiTouch) {
          lastTouchTime = Date.now();
          const rect = container.getBoundingClientRect();
          const x = touchStartX - rect.left;
          const y = touchStartY - rect.top;
          const latlng = map.containerPointToLatLng([x, y]);
          if (handleMapTapRef.current) {
            handleMapTapRef.current(latlng.lat, latlng.lng);
          }
        }
      };

      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: true });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });

      const handleMapClick = (e: any) => {
        // Tránh kích hoạt click ảo do touch end của trình duyệt
        if (Date.now() - lastTouchTime < 500) {
          return;
        }
        if (handleMapTapRef.current) {
          handleMapTapRef.current(e.latlng.lat, e.latlng.lng);
        }
      };
      map.on("click", handleMapClick);

      mapRef.current = map;
    } else {
      mapRef.current.setView(targetCoords, 16);
    }

    const map = mapRef.current;

    // custom green location marker
    const greenPinIcon = L.divIcon({
      html: `
        <div class="flex items-center justify-center w-9 h-9 rounded-full bg-[#e8f5e9] border-2 border-[#2e7d32] shadow-md relative">
          <div class="absolute inset-0 rounded-full bg-[#4caf50] opacity-40 animate-ping" style="animation-duration: 2s;"></div>
          <svg class="w-5 h-5 text-[#2e7d32]" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
      `,
      className: "custom-leaflet-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng(targetCoords);
    } else {
      const marker = L.marker(targetCoords, { icon: greenPinIcon }).addTo(map);
      markerRef.current = marker;
    }

    // Invalidate map size at multiple intervals to ensure proper layout after page transitions
    const timer1 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 100);
    const timer2 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 400);
    const timer3 = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };


  }, [leafletLoaded, selectedLocation.lat, selectedLocation.lng]);

  // Clean up bản đồ khi unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("[Map] Lỗi khi gỡ bản đồ:", e);
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);


  const renderLocationItem = (item: Location) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleSelectLocation(item)}
      className={`flex items-center justify-between gap-4 rounded-lg p-2 text-left transition w-full ${
        selectedLocation.id === item.id ? "bg-primary/10" : "bg-white"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="shrink-0">
          <MapPinIconSolid />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="truncate text-base font-medium text-text-primary">
            {item.name}
          </div>
          <div
            className="line-clamp-2 text-xxsmall text-text-secondary"
            style={{ lineHeight: "16px" }}
          >
            {item.address}
          </div>
        </div>
      </div>
      {item.distance && (
        <div className="shrink-0 font-medium text-text-primary text-small">
          {item.distance}
        </div>
      )}
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="px-4 pb-3 pt-4">
        <div className="relative w-full">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="placeholder:text-inactive h-10 w-full rounded-lg bg-neutral100 pl-10 pr-10 text-large outline-none"
            placeholder="Tìm kiếm địa điểm"
          />
          <MapPinIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSearchError("");
                setIsSearching(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer text-neutral-500 hover:text-neutral-700 bg-neutral200/50 hover:bg-neutral200 rounded-full p-1 transition"
              aria-label="Xóa tất cả"
            >
              <CloseIcon size={14} color="#7f7f7f" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pb-1">
        <div className="text-small text-text-secondary font-medium">
          {shouldShowSearchResults ? "Gợi ý địa chỉ" : "Chọn vị trí"}
        </div>
        <div className="text-small text-primary">
          {isSearching && "Đang tìm..."}
        </div>
      </div>

      <div className="max-h-[180px] overflow-y-auto px-4 py-3">
        {searchError ? (
          <div className="rounded-lg bg-white p-4 text-center text-xxsmall text-text-secondary">
            {searchError}
          </div>
        ) : shouldShowSearchResults ? (
          <div className="flex flex-col gap-3">
            {searchQuery.trim().length >= 8 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col gap-2 shadow-sm">
                <div className="text-xxsmall font-bold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  Không tìm thấy địa chỉ của bạn?
                </div>
                <div className="text-small text-text-primary">
                  Bạn có thể tự điền địa chỉ này để giao hàng:
                  <div className="mt-1 font-bold text-primary italic break-words">
                    "{searchQuery.trim()}"
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseManualAddress}
                  className="mt-1 w-full rounded-lg bg-primary py-2 text-center text-small font-semibold text-white active:scale-[0.98] transition-transform duration-100"
                >
                  Xác nhận sử dụng địa chỉ tự nhập
                </button>
              </div>
            )}

            {visibleLocations.length === 0 && !isSearching ? (
              <div className="rounded-lg bg-white p-4 text-center text-xxsmall text-text-secondary">
                Không tìm thấy gợi ý địa chỉ phù hợp nào trên bản đồ.
              </div>
            ) : (
              visibleLocations.map(renderLocationItem)
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {addressHistory.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-small text-text-secondary font-medium">Lịch sử địa chỉ đã dùng</div>
                <div className="flex flex-col gap-2.5">
                  {addressHistory.map(renderLocationItem)}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="text-small text-text-secondary font-medium">{copy.selectLocation.nearestTitle}</div>
              <div className="flex flex-col gap-2.5">
                {localLocations.map(renderLocationItem)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pb-3 flex flex-col">
        <div className="relative flex-1 min-h-[180px] overflow-hidden rounded-xl bg-neutral100">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 p-3 shadow-sm" style={{ zIndex: 1000 }}>
            <div className="text-small-m text-text-primary">
              {selectedLocation.name}
            </div>
            <div className="mt-1 text-xxsmall text-text-secondary">
              {selectedLocation.address}
            </div>
          </div>
        </div>
      </div>

      <div className="border-divider01 border-t bg-white px-4 py-4 pb-5">
        <Button
          onClick={handleConfirmLocation}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white active:bg-primary/50"
        >
          Dùng địa điểm này
        </Button>
      </div>
    </div>
  );
}
