import { ReactNode, ViewTransition } from "react";

/**
 * The page title, everywhere.
 *
 * Index and admin pages already used this; the five detail pages hand-wrote
 * `text-4xl sm:text-5xl` instead, so a race page was a size louder than the
 * library that linked to it for no reason anyone had decided. One component
 * now, and the size lives in `.type-page-title` rather than in this file, so a
 * heading that is not a page title can still match it.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  viewTransitionName,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /**
   * Pairs this title with the card that linked here, so the browser morphs one
   * into the other. The race page needs it; nothing else does yet. Dropping it
   * breaks the morph silently, which is why it is a prop rather than something
   * a caller wraps around this component from outside.
   */
  viewTransitionName?: string;
}) {
  const heading = (
    <h1 className="type-page-title mt-2 text-foreground">{title}</h1>
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="text-eyebrow font-bold uppercase text-accent">{eyebrow}</p>
        ) : null}
        {viewTransitionName ? (
          <ViewTransition name={viewTransitionName} share="race-morph" default="none">
            {heading}
          </ViewTransition>
        ) : (
          heading
        )}
        {description ? (
          <p className="mt-3 text-base leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
