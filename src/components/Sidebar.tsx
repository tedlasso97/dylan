import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { FiGitBranch } from "react-icons/fi";

interface SidebarProps {
  isDarkMode?: boolean;
}

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const Sidebar = ({ isDarkMode = false }: SidebarProps) => {
  const router = useRouter();
  const themed = (light: string, dark: string) => (isDarkMode ? dark : light);

  const linkBaseClass =
    "flex py-3 px-4 items-center gap-3 rounded-xl transition-all duration-200 text-sm font-medium cursor-pointer";

  const navItems = [
    {
      href: "/strategy",
      label: "Strategy Lab",
      Icon: FiGitBranch,
    },
  ];
  const soonItems = ["Portfolio Projector", "Portfolio Breakdown", "Crypto Portfolio"];

  return (
    <div className="flex h-full w-full flex-1 items-start">
      <nav className="flex h-full flex-1 flex-col space-y-1 p-6">
        {/* User Profile Section */}
        <div
          className={cx(
            "flex items-center gap-3 p-4 mb-8 border-b",
            themed("border-gray-300/70", "border-white/10")
          )}
        >
          <div
            className={cx(
              "w-10 h-10 rounded-full overflow-hidden flex items-center justify-center",
              themed("bg-white/70", "bg-slate-900/60")
            )}
          >
            <Image
              src="/dylan-sq (6).jpg"
              alt="Dylan Pannu profile picture"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className={cx("font-semibold text-base", themed("text-gray-900", "text-gray-100"))}>
              Dylan Pannu
            </span>
            <span className={cx("text-sm", themed("text-gray-500", "text-gray-400"))}>
              Portfolio Manager
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex flex-col gap-2 mb-8">
          {navItems.map(({ href, label, Icon }) => {
            const isActive = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cx(
                  linkBaseClass,
                  themed("hover:bg-white/80 text-slate-700", "hover:bg-white/5 text-slate-200"),
                  isActive && themed("bg-white/90 text-slate-900 border-white/70", "bg-white/10 text-white border border-cyan-300/30")
                )}
              >
                <Icon
                  className={cx(
                    "h-5 w-5",
                    isActive
                      ? themed("text-gray-800", "text-green-300")
                      : themed("text-gray-600", "text-gray-400")
                  )}
                />
                {label}
              </Link>
            );
          })}
          {soonItems.map((label) => (
            <div
              key={label}
              className={cx(
                linkBaseClass,
                "cursor-not-allowed opacity-90 border",
                themed("text-slate-700 border-white/40 bg-white/70", "text-slate-200 border-white/10 bg-white/[0.03]")
              )}
            >
              <FiGitBranch className={cx("h-5 w-5", themed("text-gray-600", "text-gray-400"))} />
              <span>{label}</span>
              <span
                className={cx(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase border",
                  themed("bg-white/80 border-white/70 text-slate-600", "bg-white/10 border-white/20 text-cyan-200")
                )}
              >
                Soon
              </span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
