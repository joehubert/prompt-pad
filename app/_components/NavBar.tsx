"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Chat" },
  { href: "/config", label: "Configuration" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border px-4 py-2">
      <span className="mr-4 text-sm font-semibold">Prompt Pad</span>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
