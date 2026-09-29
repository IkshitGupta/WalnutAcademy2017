import { FacebookIcon, YoutubeIcon } from "@walnut/ui";

const icons = {
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
} as const;

export function SocialIcon({
  name,
  className,
}: {
  name: keyof typeof icons;
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon className={className} />;
}
