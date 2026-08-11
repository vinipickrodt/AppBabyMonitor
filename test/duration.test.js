import test from "node:test";
import assert from "node:assert/strict";
import { parseDurationPartsToMinutes, parseDurationToMinutes } from "../src/domain/duration.js";

test("parseDurationToMinutes aceita formato h:mm", () => {
  assert.equal(parseDurationToMinutes("1:30"), 90);
  assert.equal(parseDurationToMinutes("0:45"), 45);
  assert.equal(parseDurationToMinutes("12:05"), 725);
});

test("parseDurationToMinutes aceita minutos como fallback", () => {
  assert.equal(parseDurationToMinutes("90"), 90);
});

test("parseDurationToMinutes rejeita duracoes invalidas", () => {
  assert.equal(parseDurationToMinutes(""), null);
  assert.equal(parseDurationToMinutes("0:00"), null);
  assert.equal(parseDurationToMinutes("1:75"), null);
  assert.equal(parseDurationToMinutes("25:00"), null);
});

test("parseDurationPartsToMinutes soma horas e minutos", () => {
  assert.equal(parseDurationPartsToMinutes("1", "30"), 90);
  assert.equal(parseDurationPartsToMinutes("0", "30"), 30);
  assert.equal(parseDurationPartsToMinutes("", "45"), 45);
  assert.equal(parseDurationPartsToMinutes("2", ""), 120);
});

test("parseDurationPartsToMinutes rejeita partes invalidas", () => {
  assert.equal(parseDurationPartsToMinutes("", ""), null);
  assert.equal(parseDurationPartsToMinutes("0", "0"), null);
  assert.equal(parseDurationPartsToMinutes("1", "60"), null);
  assert.equal(parseDurationPartsToMinutes("25", "0"), null);
  assert.equal(parseDurationPartsToMinutes("a", "10"), null);
});
