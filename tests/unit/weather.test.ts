import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoProvider } from "@/lib/integrations/weather/openMeteo";

// Weer-integratie (openluchtbad): we testen de mapping van WMO-codes naar
// onweer-/zware-regen-vlaggen, want die sturen lesbeslissingen aan.

function mockFetchOnce(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => body }) as unknown as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenMeteoProvider", () => {
  it("vlagt onweer bij weather_code 95", async () => {
    mockFetchOnce({
      current: {
        time: "2026-06-15T10:00",
        temperature_2m: 31,
        apparent_temperature: 36,
        precipitation: 2,
        weather_code: 95,
        wind_speed_10m: 12,
      },
      hourly: { time: ["2026-06-15T10:00"], precipitation_probability: [80] },
    });
    const snap = await new OpenMeteoProvider().getCurrent(5.852, -55.2038);
    expect(snap.isThunderstormRisk).toBe(true);
    expect(snap.precipitationProbability).toBe(80);
    expect(snap.temperatureC).toBe(31);
  });

  it("geen waarschuwing bij helder weer (code 0)", async () => {
    mockFetchOnce({
      current: {
        time: "2026-06-15T10:00",
        temperature_2m: 30,
        apparent_temperature: 34,
        precipitation: 0,
        weather_code: 0,
        wind_speed_10m: 8,
      },
      hourly: { time: ["2026-06-15T10:00"], precipitation_probability: [5] },
    });
    const snap = await new OpenMeteoProvider().getCurrent(5.852, -55.2038);
    expect(snap.isThunderstormRisk).toBe(false);
    expect(snap.isHeavyRainRisk).toBe(false);
  });

  it("gooit een fout bij een niet-OK respons", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503 }) as unknown as Response),
    );
    await expect(new OpenMeteoProvider().getCurrent(0, 0)).rejects.toThrow("503");
  });
});
