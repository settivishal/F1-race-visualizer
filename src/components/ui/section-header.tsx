import { ReactNode } from "react";

/**
 * The heading was `md:text-7xl`, which is a poster, not a page title. The type
 * scale now tops out somewhere a heading can actually live alongside content.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-eyebrow font-bold uppercase text-accent">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
