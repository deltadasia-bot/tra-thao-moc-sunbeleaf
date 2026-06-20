import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Text } from "zmp-ui";
import { copy } from "@/constants/copy";
import { MapPinIcon, MapPinIconSolid } from "@/components/common/vectors";

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
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const HO_CHI_MINH_CITY_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
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

const getUserBiasLocation = (): Promise<{ lat: number; lng: number }> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(HO_CHI_MINH_CITY_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(HO_CHI_MINH_CITY_CENTER),
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 5000,
      },
    );
  });

const searchGeoapifyAddresses = async (
  query: string,
  biasLocation: { lat: number; lng: number },
  signal: AbortSignal,
): Promise<Location[]> => {
  if (!GEOAPIFY_API_KEY) {
    throw new Error("Chưa cấu hình API tìm kiếm địa chỉ");
  }

  const params = new URLSearchParams({
    text: query,
    apiKey: GEOAPIFY_API_KEY,
    filter: "countrycode:vn",
    bias: `proximity:${biasLocation.lng},${biasLocation.lat}`,
    limit: "5",
    lang: "vi",
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error("Không thể tải gợi ý địa chỉ");
  }

  const data = (await response.json()) as GeoapifyResponse;
  return (data.features || []).map(toLocation).slice(0, 5);
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

  const localLocations = useMemo(
    () =>
      LOCATIONS.filter(
        (location) =>
          location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.address.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  const normalizedQuery = searchQuery.trim();
  const shouldShowSearchResults = normalizedQuery.length >= 3;
  const visibleLocations = shouldShowSearchResults
    ? searchResults
    : localLocations;

  useEffect(() => {
    getUserBiasLocation().then(setBiasLocation);
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
        const results = await searchGeoapifyAddresses(
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

  return (
    <div className="header-margin flex h-full flex-col bg-background">
      <div className="px-4 pb-3 pt-4">
        <div className="relative w-full">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="placeholder:text-inactive h-10 w-full rounded-lg bg-neutral100 pl-10 pr-3 text-large outline-none"
            placeholder="Tìm kiếm địa điểm"
          />
          <MapPinIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2" />
        </div>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="text-small text-text-secondary">
          {shouldShowSearchResults ? "Gợi ý địa chỉ" : copy.selectLocation.nearestTitle}
        </div>
        <div className="text-small text-primary">
          {isSearching
            ? "Đang tìm..."
            : `${visibleLocations.length} ${copy.common.resultCountSuffix}`}
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto px-4 py-3">
        {searchError ? (
          <div className="rounded-lg bg-white p-4 text-center text-xxsmall text-text-secondary">
            {searchError}
          </div>
        ) : visibleLocations.length === 0 && shouldShowSearchResults && !isSearching ? (
          <div className="rounded-lg bg-white p-4 text-center text-xxsmall text-text-secondary">
            Không tìm thấy địa chỉ phù hợp
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleLocations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectLocation(item)}
                className={`flex items-center justify-between gap-4 rounded-lg p-2 text-left ${
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
                  <div className="shrink-0 font-medium text-text-primary">
                    {item.distance}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pb-3">
        <div className="relative h-full min-h-64 overflow-hidden rounded-xl bg-neutral100">
          <iframe
            key={selectedLocation.id}
            title={selectedLocation.name}
            src={getGoogleMapUrl(selectedLocation)}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-white/95 p-3 shadow-sm">
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
