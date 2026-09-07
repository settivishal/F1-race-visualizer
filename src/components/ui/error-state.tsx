import { ReactNode } from "react";

/**
 * Deliberately not built on `Card`: the tone classes set their own border and
 * background, and Card's `border-line` would fight them depending on rule
 * order.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="tone tone-red rounded-xl border p-6 text-center">
      <p className="font-heading text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 opacity-90">{message}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
