import type { WeatherProvider, WeatherSnapshot } from "./index";

const BASE_URL = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast";

// WMO weather codes: 95/96/99 = onweer; 65/67/82 = zware regen/buien.
const THUNDERSTORM_CODES = new Set([95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 67, 82]);

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    precipitation_probability: number[];
  };
}

export class OpenMeteoProvider implements WeatherProvider {
  async getCurrent(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      hourly: "precipitation_probability",
      forecast_hours: "1",
      timezone: "America/Paramaribo",
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`, { signal });
    if (!res.ok) {
      throw new Error(`Open-Meteo gaf status ${res.status}`);
    }
    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current;
    if (!current) {
      throw new Error("Open-Meteo respons mist 'current' veld");
    }

    const code = current.weather_code;
    return {
      observedAt: current.time,
      temperatureC: current.temperature_2m,
      apparentTemperatureC: current.apparent_temperature ?? null,
      precipitationMm: current.precipitation,
      precipitationProbability: data.hourly?.precipitation_probability?.[0] ?? null,
      windSpeedKmh: current.wind_speed_10m,
      weatherCode: code,
      isThunderstormRisk: THUNDERSTORM_CODES.has(code),
      isHeavyRainRisk: HEAVY_RAIN_CODES.has(code),
    };
  }
}
