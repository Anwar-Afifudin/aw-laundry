import { CheckIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="shadow-sm">
          <CardHeader className="gap-3">
            <Badge className="w-fit">A&amp;W Laundry</Badge>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                UI Foundation Ready
              </CardTitle>
              <CardDescription className="leading-6">
                Tailwind CSS, shadcn/ui, dan Lucide React sudah terhubung dan
                siap digunakan.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button type="button" size="lg" className="w-full sm:w-auto">
              <CheckIcon aria-hidden="true" data-icon="inline-start" />
              Komponen siap digunakan
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
