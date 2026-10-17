import { ImageResponse } from "next/og";

/*
 * Icônes de l'application (écran d'accueil du téléphone) : l'étoile Astrinova,
 * en PNG aux tailles demandées par Android et iOS. Générées à la construction.
 *   - 192 et 512 : coins arrondis, fond transparent autour ;
 *   - maskable et apple : fond plein (le système découpe lui-même la forme).
 */
const VARIANTS = {
  "192": { size: 192, fullBleed: false },
  "512": { size: 512, fullBleed: false },
  maskable: { size: 512, fullBleed: true },
  apple: { size: 180, fullBleed: true },
} as const;

type Variant = keyof typeof VARIANTS;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  const spec = VARIANTS[variant as Variant];
  if (!spec) return new Response("Introuvable", { status: 404 });
  const { size, fullBleed } = spec;
  // Zone sûre des icônes « maskable » : le dessin tient dans le cercle central (80 %).
  const star = Math.round(size * (fullBleed ? 0.62 : 0.78));
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17151f",
          borderRadius: fullBleed ? 0 : Math.round(size * 0.25),
        }}
      >
        <svg width={star} height={star} viewBox="8 8 50 50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#b7abf0" />
              <stop offset="1" stopColor="#5b48c2" />
            </linearGradient>
          </defs>
          <path d="M30 12c1.6 10.4 6.6 15.4 17 17-10.4 1.6-15.4 6.6-17 17-1.6-10.4-6.6-15.4-17-17 10.4-1.6 15.4-6.6 17-17z" fill="url(#g)" />
          <path d="M47 40c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" fill="#e8c177" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
