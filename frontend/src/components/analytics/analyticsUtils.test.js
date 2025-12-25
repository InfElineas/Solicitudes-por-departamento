import {
  buildPeriodParams,
  buildRanking,
  computeGlobalMetrics,
  filterProductivityRows,
  normalizeProductivityRows,
  pickProductivityRows,
} from "./analyticsUtils";

describe("analyticsUtils", () => {
  const sample = [
    {
      user_id: "1",
      name: "Ana",
      department: "Soporte",
      assigned_total: 5,
      in_progress: 2,
      in_review: 1,
      attended_period: 1,
      pending_now: 1,
    },
    {
      user_id: "2",
      name: "Luis",
      department: "TI",
      status_breakdown: {
        Pendiente: 2,
        "En progreso": 1,
        "En revisión": 1,
        Finalizada: 3,
      },
    },
  ];

  test("normalizeProductivityRows maps status breakdowns and totals", () => {
    const normalized = normalizeProductivityRows(sample);
    expect(normalized).toEqual([
      expect.objectContaining({
        assigned: 5,
        inProgress: 2,
        inReview: 1,
        finished: 1,
        pending: 1,
      }),
      expect.objectContaining({
        assigned: 7,
        inProgress: 1,
        inReview: 1,
        finished: 3,
        pending: 2,
      }),
    ]);
  });

  test("filterProductivityRows filters by technician and department", () => {
    const normalized = normalizeProductivityRows(sample);
    const byTech = filterProductivityRows(normalized, {
      technician: "1",
      department: "all",
    });
    expect(byTech).toHaveLength(1);
    expect(byTech[0].name).toBe("Ana");

    const byDept = filterProductivityRows(normalized, {
      technician: "all",
      department: "TI",
    });
    expect(byDept).toHaveLength(1);
    expect(byDept[0].name).toBe("Luis");
  });

  test("computeGlobalMetrics aggregates totals and averages", () => {
    const normalized = normalizeProductivityRows(sample);
    const global = computeGlobalMetrics(normalized);
    expect(global.assigned).toBe(12); // 5 + fallback 7
    expect(global.finished).toBe(4); // 1 + 3
    expect(global.pending).toBe(3);
    expect(global.inProgress).toBe(3);
    expect(global.averagePerTech).toBeCloseTo(6);
    expect(global.averageFinishedPerTech).toBeCloseTo(2);
    expect(global.technicianCount).toBe(2);
  });

  test("normalization prioritizes status totals when breakdown exists", () => {
    const rows = [
      {
        user_id: "3",
        name: "Mia",
        status_breakdown: {
          pending: 1,
          "in progress": 1,
          review: 0,
          finished: 2,
        },
        assigned_total: 50, // histórico, debe ignorarse si hay breakdown del periodo
      },
      {
        user_id: "4",
        name: "Leo",
        assigned_total: 4,
        in_progress: 2,
        in_review: 1,
      },
    ];

    const normalized = normalizeProductivityRows(rows);
    expect(normalized[0]).toMatchObject({
      assigned: 4,
      finished: 2,
      pending: 1,
      inProgress: 1,
    });
    expect(normalized[1]).toMatchObject({
      assigned: 4,
      inProgress: 2,
      inReview: 1,
      finished: 0,
      pending: 0,
    });
  });

  test("normalization accepts underscore and uppercase status keys", () => {
    const rows = [
      {
        user_id: "5",
        name: "Keyla",
        status_breakdown: {
          PENDING_NOW: 2,
          IN_PROGRESS: 3,
          IN_REVIEW: 1,
          COMPLETADAS: 4,
        },
      },
    ];

    const normalized = normalizeProductivityRows(rows);
    expect(normalized[0]).toMatchObject({
      assigned: 10,
      pending: 2,
      inProgress: 3,
      inReview: 1,
      finished: 4,
    });
  });

  test("ranking orders by finished then assigned and reacts to dataset size", () => {
    const rowsAll = normalizeProductivityRows([
      {
        user_id: "1",
        name: "Ana",
        status_breakdown: { finished: 5, pending: 1 },
      },
      {
        user_id: "2",
        name: "Luis",
        status_breakdown: { finished: 3, pending: 4 },
      },
      {
        user_id: "3",
        name: "Mia",
        status_breakdown: { finished: 3, pending: 2 },
      },
    ]);

    const rowsMonth = normalizeProductivityRows([
      {
        user_id: "1",
        name: "Ana",
        status_breakdown: { finished: 2, pending: 1 },
      },
      {
        user_id: "2",
        name: "Luis",
        status_breakdown: { finished: 1, pending: 1 },
      },
      {
        user_id: "3",
        name: "Mia",
        status_breakdown: { finished: 0, pending: 1 },
      },
    ]);

    const rankingAll = buildRanking(rowsAll);
    const rankingMonth = buildRanking(rowsMonth);

    expect(rankingAll.map((r) => r.user_id)).toEqual(["1", "2", "3"]);
    expect(rankingMonth.map((r) => r.user_id)).toEqual(["1", "2", "3"]);

    const globalAll = computeGlobalMetrics(rowsAll);
    const globalMonth = computeGlobalMetrics(rowsMonth);

    expect(globalAll.finished).toBeGreaterThanOrEqual(globalMonth.finished);
    expect(globalAll.assigned).toBeGreaterThanOrEqual(globalMonth.assigned);
  });

  test("pickProductivityRows falls back to all-time sets", () => {
    const analytics = {
      productivity_by_tech: [],
      all_time_productivity: [{ user_id: 1 }],
    };
    const rows = pickProductivityRows(analytics, "all");
    expect(rows).toHaveLength(1);
  });

  test("buildPeriodParams constructs consistent ranges", () => {
    const fixedDate = new Date("2024-06-15T12:00:00Z");
    const all = buildPeriodParams("all", fixedDate);
    expect(all.get("range")).toBe("all");

    const month = buildPeriodParams("month", fixedDate);
    expect(month.get("period")).toBe("monthly");
    expect(month.get("start_date")).toBeDefined();
    expect(month.get("end_date")).toBeDefined();
  });
});
