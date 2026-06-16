import type {
  HourlyWeather,
  WeatherForecast,
  WeatherProvider,
  WeatherSnapshot,
} from "./index";

const BASE_URL = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com/v1/forecast";
const TIMEZONE = "America/Paramaribo";

// WMO weather codes: 95/96/99 = onweer; 65/67/82 = zware regen/buien.
const THUNDERSTORM_CODES = new Set([95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 67, 82]);

interface CurrentBlock {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
}

interface OpenMeteoResponse {
  current?: CurrentBlock;
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
}

function toSnapshot(current: CurrentBlock, firstHourProbability: number | null): WeatherSnapshot {
  const code = current.weather_code;
  return {
    observedAt: current.time,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature ?? null,
    precipitationMm: current.precipitation,
    precipitationProbability: firstHourProbability,
    windSpeedKmh: current.wind_speed_10m,
    weatherCode: code,
    isThunderstormRisk: THUNDERSTORM_CODES.has(code),
    isHeavyRainRisk: HEAVY_RAIN_CODES.has(code),
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
      timezone: TIMEZONE,
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Open-Meteo gaf status ${res.status}`);
    const data = (await res.json()) as OpenMeteoResponse;
    if (!data.current) throw new Error("Open-Meteo respons mist 'current' veld");
    return toSnapshot(data.current, data.hourly?.precipitation_probability?.[0] ?? null);
  }

  async getForecast(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherForecast> {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability,weather_code",
      forecast_hours: "24",
      timezone: TIMEZONE,
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(`Open-Meteo gaf status ${res.status}`);
    const data = (await res.json()) as OpenMeteoResponse;
    if (!data.current) throw new Error("Open-Meteo respons mist 'current' veld");

    const times = data.hourly?.time ?? [];
    const temps = data.hourly?.temperature_2m ?? [];
    const probs = data.hourly?.precipitation_probability ?? [];
    const codes = data.hourly?.weather_code ?? [];

    const hourly: HourlyWeather[] = times.map((time, i) => {
      const code = codes[i] ?? 0;
      return {
        time,
        temperatureC: temps[i] ?? 0,
        precipitationProbability: probs[i] ?? null,
        weatherCode: code,
        isThunderstormRisk: THUNDERSTORM_CODES.has(code),
        isHeavyRainRisk: HEAVY_RAIN_CODES.has(code),
      };
    });

    return {
      current: toSnapshot(data.current, probs[0] ?? null),
      hourly,
      timezone: TIMEZONE,
    };
  }
}
