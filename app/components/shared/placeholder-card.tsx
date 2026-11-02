import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "~/components/ui/card";

type PlaceholderCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  note?: string;
  action?: ReactNode;
};

export function PlaceholderCard({
  icon: Icon,
  title,
  description,
  note,
  action,
}: PlaceholderCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
        <span className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {note && (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            {note}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}
