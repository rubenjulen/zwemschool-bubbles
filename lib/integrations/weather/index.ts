// Weer-integratie achter een abstractielaag (FR-14.1). MVP gebruikt Open-Meteo
// (gratis, geen API-key). Een latere betaalde provider implementeert dezelfde
// WeatherProvider-interface zonder dat UI-code wijzigt.
//
// Context: Bubbles zwemt in de openlucht in Paramaribo. Het weer (met name
// onweer/zware buien) is operationeel relevant voor lesbeslissingen.

export interface WeatherSnapshot {
  /** Tijdstip van de waarneming/verwachting (ISO 8601, lokale tijd). */
  observedAt: string;
  temperatureC: number;
  /** Gevoelstemperatuur indien beschikbaar. */
  apparentTemperatureC: number | null;
  precipitationMm: number;
  /** Kans op neerslag voor het komende uur, 0-100. */
  precipitationProbability: number | null;
  windSpeedKmh: number;
  /** WMO weather code; zie https://open-meteo.com/en/docs */
  weatherCode: number;
  isThunderstormRisk: boolean;
  isHeavyRainRisk: boolean;
}

export interface HourlyWeather {
  /** Tijdstip waarvoor deze verwachting geldt (ISO 8601, lokale tijd). */
  time: string;
  temperatureC: number;
  precipitationProbability: number | null;
  weatherCode: number;
  isThunderstormRisk: boolean;
  isHeavyRainRisk: boolean;
}

export interface WeatherForecast {
  current: WeatherSnapshot;
  /** Uurverwachting voor de komende ~24 uur. */
  hourly: HourlyWeather[];
  /** Tijdzone waarin de tijden zijn uitgedrukt. */
  timezone: string;
}

export interface WeatherProvider {
  getCurrent(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot>;
  getForecast(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherForecast>;
}

import { OpenMeteoProvider } from "./openMeteo";

export function getWeatherProvider(): WeatherProvider {
  const provider = process.env.WEATHER_PROVIDER ?? "open-meteo";
  switch (provider) {
    case "open-meteo":
    default:
      return new OpenMeteoProvider();
  }
}

/** Convenience helpers voor componenten. */
export function getCurrentWeather(lat: number, lon: number, signal?: AbortSignal) {
  return getWeatherProvider().getCurrent(lat, lon, signal);
}

export function getWeatherForecast(lat: number, lon: number, signal?: AbortSignal) {
  return getWeatherProvider().getForecast(lat, lon, signal);
}
