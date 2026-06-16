"use client";

import { useEffect, useState } from "react";
import { getWeatherForecast, type WeatherForecast } from "@/lib/integrations/weather";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { nl } from "@/lib/i18n/nl";

// Paramaribo als standaardlocatie; per leslocatie worden later de
// coordinaten uit de `locations`-tabel gebruikt.
const PARAMARIBO = { lat: 5.852, lon: -55.2038 };

// WMO weather code -> emoji + korte omschrijving (NL).
function describe(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "helder" };
  if (code === 1 || code === 2) return { icon: "🌤️", label: "licht bewolkt" };
  if (code === 3) return { icon: "☁️", label: "bewolkt" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "mist" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", label: "motregen" };
  if (code === 61 || code === 63 || code === 80 || code === 81) return { icon: "🌧️", label: "regen" };
  if (code === 65 || code === 67 || code === 82) return { icon: "🌧️", label: "zware regen" };
  if (code >= 95) return { icon: "⛈️", label: "onweer" };
  return { icon: "🌡️", label: "" };
}

// "2026-06-15T16:00" -> "16:00"
function hhmm(iso: string): string {
  return iso.length >= 16 ? iso.slice(11, 16) : iso;
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function WeatherWidget({
  lat = PARAMARIBO.lat,
  lon = PARAMARIBO.lon,
  locationLabel = "Paramaribo",
}: {
  lat?: number;
  lon?: number;
  locationLabel?: string;
}) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getWeatherForecast(lat, lon, controller.signal)
      .then(setForecast)
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
      ) : !forecast ? (
        <p className="mt-2 text-xs text-slate-400">{nl.weather.loading}</p>
      ) : (
        <>
          {/* Huidige conditie, met expliciet tijdstip */}
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {describe(forecast.current.weatherCode).icon}
            </span>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-bubbles-700">
                  {Math.round(forecast.current.temperatureC)}°C
                </span>
                <span className="text-xs text-slate-500">
                  nu · {hhmm(forecast.current.observedAt)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {describe(forecast.current.weatherCode).label}
                {forecast.current.precipitationProbability !== null &&
                  ` · ${forecast.current.precipitationProbability}% kans op neerslag`}
              </p>
            </div>
          </div>

          {(forecast.current.isThunderstormRisk || forecast.current.isHeavyRainRisk) && (
            <div className="mt-2">
              <StatusBadge tone="danger">{nl.weather.rainWarning}</StatusBadge>
            </div>
          )}

          {/* 24-uurs verwachting, per uur, met duidelijke tijdstippen */}
          {forecast.hourly.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-slate-500">
                {nl.weather.next24h} · {dayLabel(forecast.hourly[0]!.time)}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {forecast.hourly.map((h) => {
                  const risk = h.isThunderstormRisk || h.isHeavyRainRisk;
                  return (
                    <div
                      key={h.time}
                      className={`flex min-w-[56px] flex-col items-center rounded-lg border px-2 py-1.5 text-center ${
                        risk ? "border-rose-300 bg-rose-50" : "border-bubbles-100 bg-bubbles-50/40"
                      }`}
                      title={`${dayLabel(h.time)} ${hhmm(h.time)}`}
                    >
                      <span className="text-[11px] font-medium text-slate-600">{hhmm(h.time)}</span>
                      <span className="text-base" aria-hidden>
                        {describe(h.weatherCode).icon}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {Math.round(h.temperatureC)}°
                      </span>
                      <span className="text-[10px] text-bubbles-600">
                        {h.precipitationProbability ?? 0}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Tijden in lokale tijd ({locationLabel}). % = kans op neerslag.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
