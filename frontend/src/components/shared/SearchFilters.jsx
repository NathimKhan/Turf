import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Badge } from "../ui/badge.jsx";
import { Button } from "../ui/button.jsx";
import { Card, CardContent } from "../ui/card.jsx";

const filterGroups = [
  { label: "Sport", options: ["Football", "Cricket", "Tennis", "Basketball"] },
  { label: "Price", options: ["Any", "$0-$50", "$50-$80", "$80+"] },
  { label: "Distance", options: ["Any", "Under 1 mi", "Under 3 mi", "Under 5 mi"] },
  { label: "Amenities", options: ["Flood Lights", "Indoor AC", "Parking", "Cafe"] },
];

export function SearchFilters({ compact = false }) {
  const [selectedFilters, setSelectedFilters] = useState({
    Amenities: "Flood Lights",
    Distance: "Under 3 mi",
    Price: "Any",
    Sport: "Football",
  });

  function selectFilter(group, option) {
    setSelectedFilters((current) => ({ ...current, [group]: option }));
  }

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
        {filterGroups.map((group) => (
          <div key={group.label}>
            <p className="text-sm font-black">{group.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.options.map((option) => {
                const active = selectedFilters[group.label] === option;

                return (
                  <button
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-surface-border bg-white text-ink-muted hover:border-primary hover:text-primary"
                    }`}
                    key={option}
                    onClick={() => selectFilter(group.label, option)}
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
        <div className="flex flex-wrap gap-2 border-t border-surface-border pt-4">
          {Object.entries(selectedFilters).map(([label, value]) => (
            <Badge key={label} variant="primary">
              {label}: {value}
            </Badge>
          ))}
        </div>
        <Button className="w-full">Apply Filters</Button>
      </CardContent>
    </Card>
  );
}
