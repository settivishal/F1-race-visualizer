'use client';

import { useEffect, useRef } from 'react';

/**
 * Makes the surrounding GET form apply when a select changes.
 *
 * Choosing a driver, a season or a comparison kind *is* the intent; pressing a
 * second button to confirm it is friction the race library never had, because
 * its years are links. These forms cannot be links — they carry several values
 * at once — so the change event submits instead.
 *
 * Selects only. `change` on a text input fires on blur, which would navigate
 * out from under someone who is still typing. The submit button stays in the
 * markup: it is what the form does with no JavaScript, and it is still the
 * keyboard path for a search field beside the select.
 */
export function AutoSubmit() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = marker.current?.closest('form');
    if (!form) return;

    const onChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement) form.requestSubmit();
    };

    form.addEventListener('change', onChange);
    return () => form.removeEventListener('change', onChange);
  }, []);

  return <span ref={marker} hidden />;
}
