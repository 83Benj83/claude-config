import {
  BrowserIcon,
  ChatCircleTextIcon,
  HandshakeIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  StorefrontIcon,
  TargetIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";
import type { IconName } from "@/config/site";

const ICONS = {
  browser: BrowserIcon,
  storefront: StorefrontIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  wrench: WrenchIcon,
  target: TargetIcon,
  chat: ChatCircleTextIcon,
  handshake: HandshakeIcon,
  rocket: RocketLaunchIcon,
} satisfies Record<IconName, unknown>;

/** Icônes référencées par nom dans `config/site.ts`. */
export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  const Component = ICONS[name];
  return <Component size={size} weight="regular" className={className} aria-hidden />;
}
