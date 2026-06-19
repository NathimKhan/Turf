import { Button } from "../ui/button.jsx";
import { Card, CardContent } from "../ui/card.jsx";
import { Icon } from "./icons.jsx";

export function EmptyState({ actionLabel, description, icon = "Search", onAction, title }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name={icon} size={26} />
        </span>
        <h2 className="mt-4 text-xl font-black text-ink">{title}</h2>
        {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
        {actionLabel && onAction && (
          <Button className="mt-6" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
