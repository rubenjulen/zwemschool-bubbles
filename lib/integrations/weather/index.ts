// Weer-integratie achter een abstractielaag (FR-14.1). MVP gebruikt Open-Meteo
// (gratis, geen API-key). Een latere betaalde provider implementeert dezelfde
// WeatherProvider-interface zonder dat UI-code wijzigt.
//
// Context: Bubbles zwemt in de openlucht in Paramaribo. Het weer (met name
// onweer/zware buien) is operationeel relevant voor lesbeslissingen.

export interface WeatherSnapshot {
  /** Tijdstip van de waarneming/verwachting (ISO 8601). */
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

export interface WeatherProvider {
  getCurrent(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot>;
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

/** Convenience helper voor componenten. */
export function getCurrentWeather(lat: number, lon: number, signal?: AbortSignal) {
  return getWeatherProvider().getCurrent(lat, lon, signal);
}
