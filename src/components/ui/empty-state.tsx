import { ReactNode } from "react";
import { Card } from "./card";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed bg-transparent py-10 text-center shadow-none">
      <p className="font-heading text-lg font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}
