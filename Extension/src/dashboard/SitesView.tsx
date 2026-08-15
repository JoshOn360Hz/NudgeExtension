import { useState } from "react";
import { ListFilter, Plus, Trash2 } from "lucide-react";
import { categoryLabels, categoryOrder } from "../shared/constants";
import type { CategoryId, DomainRule, ExtensionRequest } from "../shared/models";
import { Button, Card, CategoryBadge, EmptyState, Field, IconButton, SectionHeading } from "../ui/components";

export function SitesView({ rules, mutate }: { rules: DomainRule[]; mutate: (request: ExtensionRequest) => Promise<void> }) {
  const [pattern, setPattern] = useState("");
  const [category, setCategory] = useState<CategoryId>("other");

  const save = async () => {
    await mutate({
      type: "SAVE_RULE",
      rule: { pattern, matchType: pattern.startsWith("*.") ? "subdomainWildcard" : "domain", category, enabled: true }
    });
    setPattern("");
  };

  const toggle = async (rule: DomainRule) => {
    await mutate({
      type: "SAVE_RULE",
      rule: {
        id: rule.id,
        pattern: rule.pattern,
        matchType: rule.matchType,
        category: rule.category,
        enabled: !rule.enabled
      }
    });
  };

  return (
    <>
      <Card className="form-card">
        <SectionHeading title="Classify a website" description="Your rules take priority over Nudge’s built-in categories." />
        <div className="form-grid site-rule-grid">
          <Field label="Domain or wildcard" hint="Use example.com or *.example.com">
            <input value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="example.com" />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)}>
              {categoryOrder.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}
            </select>
          </Field>
          <Button variant="primary" icon={Plus} disabled={!pattern.trim()} onClick={() => void save()}>Add rule</Button>
        </div>
      </Card>

      <SectionHeading title="Your site rules" description="Historical activity keeps the category recorded at the time." />
      <Card className="list-card">
        {rules.length ? rules.map((rule) => (
          <div className="list-row" key={rule.id}>
            <div className="list-primary">
              <strong>{rule.pattern}</strong>
              <small>{rule.matchType === "subdomainWildcard" ? "Subdomain wildcard" : "Domain"}</small>
            </div>
            <CategoryBadge category={rule.category} />
            <label className="toggle">
              <input type="checkbox" checked={rule.enabled} onChange={() => void toggle(rule)} />
              <span>{rule.enabled ? "On" : "Off"}</span>
            </label>
            <IconButton icon={Trash2} label={`Delete ${rule.pattern} rule`} onClick={() => void mutate({ type: "DELETE_RULE", id: rule.id })} />
          </div>
        )) : (
          <EmptyState icon={ListFilter} title="No custom rules">Common sites are classified automatically. Add a rule when you want to override one.</EmptyState>
        )}
      </Card>
    </>
  );
}
