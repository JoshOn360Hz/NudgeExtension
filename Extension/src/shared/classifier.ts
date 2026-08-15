import { builtInRules } from "./constants";
import type { CategoryId, DomainRule } from "./models";

export const normalizeHostname = (value: string) => {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  return trimmed.replace(/^www\./, "").replace(/\.$/, "");
};

export const normalizeRulePattern = (value: string) => {
  const wildcard = value.trim().startsWith("*.");
  const hostname = normalizeHostname(value.replace(/^\*\./, ""));
  if (!hostname || !hostname.includes(".") || !/^[a-z0-9.-]+$/.test(hostname)) {
    throw new Error("Enter a valid domain such as example.com or *.example.com");
  }
  return wildcard ? `*.${hostname}` : hostname;
};

const ruleScore = (rule: DomainRule) => {
  if (rule.matchType === "exact") return 3000 + rule.pattern.length;
  if (rule.matchType === "subdomainWildcard") return 2000 + rule.pattern.length;
  return 1000 + rule.pattern.length;
};

const matchesRule = (hostname: string, rule: Pick<DomainRule, "pattern" | "matchType">) => {
  const domain = rule.pattern.replace(/^\*\./, "");
  if (rule.matchType === "exact") return hostname === domain;
  if (rule.matchType === "subdomainWildcard") return hostname !== domain && hostname.endsWith(`.${domain}`);
  return hostname === domain || hostname.endsWith(`.${domain}`);
};

export const classifyHostname = (rawHostname: string, rules: DomainRule[]): CategoryId => {
  const hostname = normalizeHostname(rawHostname);
  const userMatch = rules
    .filter((rule) => rule.enabled && matchesRule(hostname, rule))
    .sort((left, right) => ruleScore(right) - ruleScore(left))[0];
  if (userMatch) return userMatch.category;
  const builtInMatch = builtInRules.find((rule) => hostname === rule.pattern || hostname.endsWith(`.${rule.pattern}`));
  return builtInMatch?.category ?? "other";
};

export const inferMatchType = (pattern: string): DomainRule["matchType"] =>
  pattern.startsWith("*.") ? "subdomainWildcard" : "domain";
