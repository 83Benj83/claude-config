import { startTransition, type FormEvent } from "react";

/**
 * Soumet un formulaire à une Server Action sans la réinitialisation
 * automatique de React 19 : les champs gardent ce que l'utilisateur a saisi
 * (utile en cas d'erreur, et pour les champs contrôlés comme un <select>).
 * L'attribut `action` reste en place pour fonctionner sans JavaScript.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
