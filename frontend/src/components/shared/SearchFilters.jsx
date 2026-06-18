import { useEffect, useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { Input } from "../ui/input.jsx";

export function SearchFilters({
  compact = false,
  initialFilters = {},
  metadata = {},
  onApply = () => {},
}) {
  const [filters, setFilters] = useState({
    date: initialFilters.date || "",
    location: initialFilters.location || "",
    sport: initialFilters.sport || "",
  });

  useEffect(() => {
    setFilters({
      date: initialFilters.date || "",
      location: initialFilters.location || "",
      sport: initialFilters.sport || "",
    });
  }, [initialFilters.date, initialFilters.location, initialFilters.sport]);

  const groups = [
    { key: "sport", label: "Sport", options: metadata.sports || [] },
    { key: "location", label: "Location", options: metadata.cities || metadata.locations || [] },
  ];

  return (
    <Card className={compact ? "shadow-none" : "h-max"}>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="muted-label text-primary">Filters</p>
            <h2 className="mt-1 text-xl font-black">Refine venues</h2>
          </div>
          <SlidersHorizontal className="text-ink-soft" size={20} />
        </div>
        {groups.map((group) => (
          <div key={group.key}>
            <p className="text-sm font-black">{group.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  !filters[group.key] ? "border-primary bg-primary text-white" : "border-surface-border bg-white"
                }`}
                onClick={() => setFilters((current) => ({ ...current, [group.key]: "" }))}
                type="button"
              >
                {!filters[group.key] && <Check size={13} />}
                Any
              </button>
              {group.options.map((option) => {
                const active = filters[group.key] === option;
                return (
                  <button
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-surface-border bg-white text-ink-muted hover:border-primary hover:text-primary"
                    }`}
                    key={option}
                    onClick={() => setFilters((current) => ({ ...current, [group.key]: option }))}
                    type="button"
                  >
                    {active && <Check size={13} />}
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <label className="block">
          <span className="text-sm font-black">Date</span>
          <Input
            className="mt-2"
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
            type="date"
            value={filters.date}
          />
        </label>
        <div className="flex flex-wrap gap-2 border-t border-surface-border pt-4">
          {Object.entries(filters).filter(([, value]) => value).map(([label, value]) => (
            <Badge key={label} variant="primary">
              {label}: {value}
            </Badge>
          ))}
        </div>
        <Button className="w-full" onClick={() => onApply(filters)}>
          Apply Filters
        </Button>
      </CardContent>
    </Card>
  );
}
