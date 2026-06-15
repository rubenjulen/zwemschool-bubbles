"use client";

import { useEffect, useState } from "react";
import { getCurrentWeather, type WeatherSnapshot } from "@/lib/integrations/weather";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { nl } from "@/lib/i18n/nl";

// Paramaribo als standaardlocatie; per leslocatie worden later de
// coordinaten uit de `locations`-tabel gebruikt.
const PARAMARIBO = { lat: 5.852, lon: -55.2038 };

export function WeatherWidget({
  lat = PARAMARIBO.lat,
  lon = PARAMARIBO.lon,
  locationLabel = "Paramaribo",
}: {
  lat?: number;
  lon?: number;
  locationLabel?: string;
}) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getCurrentWeather(lat, lon, controller.signal)
      .then(setWeather)
      .catch(() => setError(true));
    return () => controller.abort();
  }, [lat, lon]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-bubbles-800">{nl.weather.title}</h2>
        <span className="text-xs text-slate-400">{locationLabel}</span>
      </div>

      {error ? (
        <p className="mt-2 text-xs text-slate-500">{nl.weather.unavailable}</p>
      ) : !weather ? (
        <p className="mt-2 text-xs text-slate-400">{nl.weather.loading}</p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-bubbles-700">
              {Math.round(weather.temperatureC)}°C
            </span>
            {weather.precipitationProbability !== null && (
              <span className="text-xs text-slate-500">
                {weather.precipitationProbability}% kans op neerslag
              </span>
            )}
          </div>
          {(weather.isThunderstormRisk || weather.isHeavyRainRisk) && (
            <StatusBadge tone="danger">{nl.weather.rainWarning}</StatusBadge>
          )}
        </div>
      )}
    </Card>
  );
}
