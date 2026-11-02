import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthFormShell({
  title,
  description,
  children,
  footer,
}: AuthFormShellProps) {
  return (
    <Card className="w-full gap-0 py-0 shadow-sm ring-slate-200/80">
      <CardHeader className="gap-3 px-6 pb-6 pt-6 sm:px-8 sm:pt-8">
        <div className="space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription className="leading-6 text-slate-600">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        {children}
      </CardContent>
      {footer ? (
        <CardFooter className="justify-center border-slate-200 bg-slate-50 px-6 py-4 text-center text-sm text-slate-600 sm:px-8">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
