import { WashingMachine } from "lucide-react";
import { Link } from "react-router";

import { cn } from "~/lib/utils";

type BrandLogoProps = {
  to?: string;
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ to, className, compact = false }: BrandLogoProps) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <WashingMachine aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-heading text-base font-bold tracking-tight text-foreground">
            A&amp;W Laundry
          </span>
          <span className="mt-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
            Bersih, mudah, terpercaya
          </span>
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex w-fit items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
    className,
  );

  if (to) {
    return (
      <Link
        aria-label={compact ? "A&W Laundry" : undefined}
        className={classes}
        to={to}
      >
        {content}
      </Link>
    );
  }

  return (
    <div aria-label={compact ? "A&W Laundry" : undefined} className={classes}>
      {content}
    </div>
  );
}
