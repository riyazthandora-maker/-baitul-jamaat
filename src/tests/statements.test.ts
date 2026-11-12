import { describe, it, expect, afterEach, vi } from "vitest";
import {
  buildMemberStatement,
  currentIstMonth,
  effectiveDate,
  normalizeMonth,
  type StatementLedgerRow,
} from "@/lib/statements";

const member = {
  id: "member-1",
  full_name: "Test Member",
  member_number: "M-BJM-0001",
  phone: "9999999999",
  email: "member@example.com",
  address: null,
  created_at: "2026-01-01T00:00:00Z",
};

const masjid = {
  name: "Test Masjid",
  address: "Test Street",
  phone: "1234567890",
};

let sequence = 0;

function row(overrides: Partial<StatementLedgerRow>): StatementLedgerRow {
  sequence += 1;
  return {
    id: `row-${sequence}`,
    type: "charge",
    amount: 0,
    description: null,
    created_at: "2026-01-01T05:00:00Z",
    transaction_date: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("currentIstMonth / effectiveDate", () => {
  it("returns the Indian calendar month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00Z"));
    expect(currentIstMonth()).toBe("2026-07");
  });

  it("assigns a UTC evening timestamp to the next IST day", () => {
    expect(
      effectiveDate({
        created_at: "2026-10-31T20:00:00Z",
        transaction_date: null,
      })
    ).toBe("2026-11-01");
  });

  it("prefers transaction_date over created_at", () => {
    expect(
      effectiveDate({
        created_at: "2026-11-20T10:00:00Z",
        transaction_date: "2026-11-02",
      })
    ).toBe("2026-11-02");
  });
});

describe("normalizeMonth", () => {
  it("keeps a valid YYYY-MM value", () => {
    expect(normalizeMonth("2026-03")).toBe("2026-03");
  });

  it("falls back to the current IST month for invalid input", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00Z"));
    expect(normalizeMonth("2025-13")).toBe("2026-07");
    expect(normalizeMonth(null)).toBe("2026-07");
  });
});

describe("buildMemberStatement", () => {
  it("computes the opening balance from prior entries and migration rows", () => {
    const statement = buildMemberStatement({
      member,
      masjid,
      month: "2026-11",
      rows: [
        row({ type: "opening_balance", amount: 100, created_at: "2026-01-05T05:00:00Z" }),
        row({ type: "charge", amount: 50, transaction_date: "2026-10-10" }),
        row({ type: "payment", amount: 30, transaction_date: "2026-10-20" }),
        row({ type: "charge", amount: 20, transaction_date: "2026-11-05" }),
        row({ type: "charge", amount: 999, transaction_date: "2026-12-05" }),
      ],
    });

    expect(statement.openingBalance).toBe(120);
    expect(statement.charges).toBe(20);
    expect(statement.closingBalance).toBe(140);
    expect(statement.entries).toHaveLength(1);
    expect(statement.entries[0].description).toBe("Charge");
    expect(statement.entries[0].balance).toBe(140);
  });

  it("excludes opening_balance migration rows from the month table", () => {
    const statement = buildMemberStatement({
      member,
      masjid,
      month: "2026-11",
      rows: [
        row({ type: "opening_balance", amount: 500, transaction_date: "2026-11-01" }),
      ],
    });

    expect(statement.openingBalance).toBe(500);
    expect(statement.entries).toHaveLength(0);
    expect(statement.closingBalance).toBe(500);
  });

  it("debits charges and credits payments and discounts with a running balance", () => {
    const statement = buildMemberStatement({
      member,
      masjid,
      month: "2026-11",
      rows: [
        row({ type: "charge", amount: 100, transaction_date: "2026-10-01" }),
        row({ type: "charge", amount: 200, transaction_date: "2026-11-03" }),
        row({ type: "discount", amount: 50, transaction_date: "2026-11-10", description: "Hardship" }),
        row({ type: "payment", amount: 80, transaction_date: "2026-11-15", description: "UPI" }),
      ],
    });

    expect(statement.openingBalance).toBe(100);
    expect(statement.charges).toBe(200);
    expect(statement.discounts).toBe(50);
    expect(statement.payments).toBe(80);
    expect(statement.closingBalance).toBe(170);
    expect(statement.entries.map((entry) => entry.balance)).toEqual([300, 250, 170]);
    expect(statement.entries[1].description).toBe("Discount — Hardship");
    expect(statement.entries[1].credit).toBe(50);
    expect(statement.entries[2].credit).toBe(80);
  });

  it("carries the opening balance through an empty month", () => {
    const statement = buildMemberStatement({
      member,
      masjid,
      month: "2026-12",
      rows: [
        row({ type: "charge", amount: 120, transaction_date: "2026-11-30" }),
      ],
    });

    expect(statement.openingBalance).toBe(120);
    expect(statement.entries).toHaveLength(0);
    expect(statement.closingBalance).toBe(120);
  });

  it("supports negative closing balances (advance credit)", () => {
    const statement = buildMemberStatement({
      member,
      masjid,
      month: "2026-11",
      rows: [
        row({ type: "charge", amount: 50, transaction_date: "2026-11-01" }),
        row({ type: "payment", amount: 80, transaction_date: "2026-11-02" }),
      ],
    });

    expect(statement.closingBalance).toBe(-30);
    expect(statement.entries[1].balance).toBe(-30);
  });
});
