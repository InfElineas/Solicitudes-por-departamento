import { deriveHistory } from "./historyUtils";

describe("deriveHistory", () => {
  it("merges explicit history with status timestamps and sorts ascending with durations", () => {
    const data = {
      history: [
        {
          at: "2024-05-10T12:00:00Z",
          from: "Pendiente",
          to: "En progreso",
          by: "Ana",
        },
      ],
      status_timestamps: {
        finished: "2024-06-01T10:00:00Z",
        review: "2024-05-20T09:30:00Z",
      },
      created_at: "2024-05-01T00:00:00Z",
    };

    const result = deriveHistory(data);
    expect(result[0].to).toBe("Creado / Solicitado");
    expect(result[result.length - 1].to).toBe("Finalizada");
    expect(result.some((r) => r.to === "En progreso")).toBe(true);
    expect(result.some((r) => r.durationLabel)).toBe(true);
  });

  it("returns empty array when there is no data", () => {
    expect(deriveHistory(null)).toEqual([]);
    expect(deriveHistory({})).toEqual([]);
  });

  it("combines requested and created into a single earliest entry", () => {
    const data = {
      requested_at: "2024-04-01T00:00:00Z",
      created_at: "2024-04-05T00:00:00Z",
    };
    const history = deriveHistory(data);
    expect(history[0].to).toBe("Creado / Solicitado");
    expect(history[0].at).toBe("2024-04-01T00:00:00.000Z");
  });
});
