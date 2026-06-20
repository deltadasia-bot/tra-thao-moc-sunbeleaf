import { copy } from "@/constants/copy";

export const SUNBELEAF_LOGO_URL =
  "https://deltadasia.com/wp-content/uploads/2026/06/Logo-SunBeleaf-chuan-chu-den-300x300.png";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "size-[22px]" }: LogoProps) {
  return (
    <img
      src={SUNBELEAF_LOGO_URL}
      alt={copy.brand.name}
      draggable={false}
      className={`${className} object-contain`}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
    />
  );
}
