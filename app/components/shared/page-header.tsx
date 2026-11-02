import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
