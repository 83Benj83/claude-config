import { Fragment } from "react";

/** Texte d'un modèle : les passages entre crochets (« [nom du commerce] ») sont surlignés, à remplacer avant l'envoi. */
export function Placeholders({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("[") && part.endsWith("]") ? (
          <mark key={index} className="rounded-md bg-accent-soft px-1 py-px font-medium text-accent-ink">
            {part.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
