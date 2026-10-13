"use client";

import {
  BookmarkSimpleIcon,
  BrowserIcon,
  BuildingsIcon,
  ChartBarIcon,
  ChatCircleTextIcon,
  DotsThreeCircleIcon,
  EnvelopeSimpleIcon,
  FacebookLogoIcon,
  GearSixIcon,
  HandshakeIcon,
  HouseIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  PlusCircleIcon,
  RocketLaunchIcon,
  StorefrontIcon,
  TargetIcon,
  TrophyIcon,
  UsersThreeIcon,
  WrenchIcon,
  type Icon as PhosphorIcon,
  type IconWeight,
} from "@phosphor-icons/react";
import type { NavIcon } from "@/config/navigation";
import type { IconName } from "@/config/site";
import type { Channel } from "@/lib/types";

const ICONS: Record<IconName | NavIcon | `channel-${Channel}`, PhosphorIcon> = {
  // contenu de l'agence
  browser: BrowserIcon,
  storefront: StorefrontIcon,
  "magnifying-glass": MagnifyingGlassIcon,
  wrench: WrenchIcon,
  target: TargetIcon,
  chat: ChatCircleTextIcon,
  handshake: HandshakeIcon,
  rocket: RocketLaunchIcon,
  // navigation
  home: HouseIcon,
  add: PlusCircleIcon,
  search: MagnifyingGlassIcon,
  ranking: TrophyIcon,
  report: ChartBarIcon,
  team: UsersThreeIcon,
  resources: BookmarkSimpleIcon,
  agency: BuildingsIcon,
  admin: GearSixIcon,
  // moyens de contact
  "channel-telephone": PhoneIcon,
  "channel-email": EnvelopeSimpleIcon,
  "channel-instagram": InstagramLogoIcon,
  "channel-facebook": FacebookLogoIcon,
  "channel-linkedin": LinkedinLogoIcon,
  "channel-visite": StorefrontIcon,
  "channel-formulaire": BrowserIcon,
  "channel-autre": DotsThreeCircleIcon,
};

export type IconKey = keyof typeof ICONS;

/** Icônes de l'application, référencées par nom (une seule famille : Phosphor). */
export function Icon({
  name,
  size = 20,
  weight = "regular",
  className,
}: {
  name: IconKey;
  size?: number;
  weight?: IconWeight;
  className?: string;
}) {
  const Component = ICONS[name];
  return <Component size={size} weight={weight} className={className} aria-hidden />;
}

export function ChannelIcon({ channel, size = 16, className }: { channel: Channel; size?: number; className?: string }) {
  return <Icon name={`channel-${channel}`} size={size} className={className} />;
}
