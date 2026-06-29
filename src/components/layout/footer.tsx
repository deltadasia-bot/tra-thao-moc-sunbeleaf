import { useLocation, useNavigate } from "react-router-dom";
import { HomeIcon, MenuIcon } from "@/components/common/vectors";
import { cn } from "@/utils/cn";

function ArticleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3h9l3 3v15H6V3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 10h6M9 14h6M9 18h4" stroke="currentColor" strokeWidth="2" />
      <path d="M15 3v4h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NewsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h13v14H4V5Zm13 4h3v10a2 2 0 0 1-2 2H6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 9h7M7 13h7M7 17h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={active ? "var(--zmp-theme-color-primary)" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="7"
        r="4"
        stroke={active ? "var(--zmp-theme-color-primary)" : "currentColor"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    name: "Trang chủ",
    path: "/",
    icon: HomeIcon,
  },
  {
    name: "Sản phẩm",
    path: "/menu",
    icon: MenuIcon,
  },
  {
    name: "Bài viết",
    path: "/articles",
    icon: ArticleIcon,
  },
  {
    name: "Tin tức",
    path: "/news",
    icon: NewsIcon,
  },
  {
    name: "Tôi",
    path: "/profile",
    icon: UserIcon,
  },
];

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const activeKey =
    NAV_ITEMS.find((item) =>
      item.path === "/" ? pathname === "/" : pathname.startsWith(item.path),
    )?.path ?? "/";

  return (
    <nav className="liquid-glass-nav grid grid-cols-5 rounded-t-3xl border-t border-white/70 px-2 pb-4 pt-2">
      {NAV_ITEMS.map((item) => (
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-col items-center gap-1 rounded-2xl py-1.5 transition",
            activeKey === item.path
              ? "bg-white/55 text-primary shadow-sm"
              : "text-text-disabled",
          )}
          key={item.path}
          onClick={() => navigate(item.path)}
        >
          <item.icon active={activeKey === item.path} />
          <div
            className={cn(
              "truncate text-xxxxsmall",
              activeKey === item.path
                ? "!font-medium !text-primary"
                : "!text-text-disabled",
            )}
          >
            {item.name}
          </div>
        </button>
      ))}
    </nav>
  );
}
