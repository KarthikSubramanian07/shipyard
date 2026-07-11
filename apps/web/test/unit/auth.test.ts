import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateSessionToken, sessionIdFromToken } from "@/lib/auth/session";
import { escapeLike, toFtsMatch } from "@/lib/services/search";

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword(hash, "hunter3")).toBe(false);
  });

  it("rejects malformed stored hashes", async () => {
    expect(await verifyPassword("garbage", "x")).toBe(false);
    expect(await verifyPassword("", "x")).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
  });
});

describe("session tokens", () => {
  it("generates distinct tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("derives a stable sha-256 session id", () => {
    const token = "abcdefghij";
    const id = sessionIdFromToken(token);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionIdFromToken(token)).toBe(id);
  });
});

describe("toFtsMatch", () => {
  it("quotes tokens and adds prefix wildcards", () => {
    expect(toFtsMatch("hand of darkness")).toBe('"hand"* "of"* "darkness"*');
  });
  it("strips punctuation that would break FTS", () => {
    expect(toFtsMatch('the "matrix"!')).toBe('"the"* "matrix"*');
  });
  it("returns null for empty input", () => {
    expect(toFtsMatch("   ")).toBeNull();
    expect(toFtsMatch("!!!")).toBeNull();
  });
  it("caps token count", () => {
    const many = Array.from({ length: 20 }, (_, i) => `t${i}`).join(" ");
    expect(toFtsMatch(many)!.split(" ")).toHaveLength(10);
  });
});

describe("escapeLike", () => {
  it("escapes LIKE metacharacters", () => {
    expect(escapeLike("100%_off")).toBe("100\\%\\_off");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
});
