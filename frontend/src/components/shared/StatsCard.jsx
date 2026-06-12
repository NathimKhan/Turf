import { useEffect, useMemo, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";
import { Card, CardContent } from "../ui/card.jsx";
import { Icon } from "./icons.jsx";

function parseMetricValue(value) {
  const rawValue = String(value);
  const match = rawValue.match(/^([^0-9+-]*)([+-]?\d[\d,]*(?:\.\d+)?)(.*)$/);

  if (!match) {
    return null;
  }

  const numericText = match[2];
  const decimals = numericText.includes(".") ? numericText.split(".")[1].length : 0;

  return {
    decimals,
    number: Number(numericText.replace(/,/g, "")),
    prefix: match[1],
    suffix: match[3],
  };
}

function formatMetricValue(value, metric) {
  const formatted = value.toLocaleString("en-US", {
    maximumFractionDigits: metric.decimals,
    minimumFractionDigits: metric.decimals,
  });

  return `${metric.prefix}${formatted}${metric.suffix}`;
}

function AnimatedMetric({ value, delay }) {
  const prefersReducedMotion = useReducedMotion();
  const metric = useMemo(() => parseMetricValue(value), [value]);
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(String(value));

  useMotionValueEvent(motionValue, "change", (latest) => {
    if (metric) {
      setDisplayValue(formatMetricValue(latest, metric));
    }
  });

  useEffect(() => {
    if (!metric || prefersReducedMotion) {
      setDisplayValue(String(value));
      return undefined;
    }

    motionValue.set(0);
    const controls = animate(motionValue, metric.number, {
      delay,
      duration: 0.9,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [delay, metric, motionValue, prefersReducedMotion, value]);

  return displayValue;
}

export function StatsCard({ label, value, trend, icon = "Activity", tone = "primary", delay = 0 }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    secondary: "bg-secondary-soft text-secondary-deep",
    accent: "bg-accent-soft text-accent-deep",
    warning: "bg-warning-soft text-amber-700",
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.45, delay }}
    >
      <Card interactive>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className={`grid h-12 w-12 place-items-center rounded-xl ${tones[tone] || tones.primary}`}>
              <Icon name={icon} />
            </div>
            {trend && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-sm font-bold text-accent-deep">{trend}</span>}
          </div>
          <p className="muted-label mt-6">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-normal text-ink">
            <AnimatedMetric delay={delay} value={value} />
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
