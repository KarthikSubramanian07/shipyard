"use client";

import { LogOut, PenLine, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions/auth";
import { Avatar, type AvatarUser } from "@/components/ui/avatar";

export function UserMenu({ user }: { user: AvatarUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Account menu"
      >
        <Avatar user={user} size="md" />
      </button>
      {open && (
        <div className="border-border bg-popover absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border p-1.5 shadow-lg">
          <MenuLink href={`/u/${user.username}`} icon={UserIcon} onClick={() => setOpen(false)}>
            Your profile
          </MenuLink>
          <MenuLink href="/write" icon={PenLine} onClick={() => setOpen(false)}>
            Write a fic
          </MenuLink>
          <MenuLink href="/settings" icon={Settings} onClick={() => setOpen(false)}>
            Settings
          </MenuLink>
          <div className="bg-border my-1 h-px" />
          <form action={logout}>
            <button
              type="submit"
              className="text-foreground hover:bg-muted flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-foreground hover:bg-muted flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
    >
      <Icon className="size-4" /> {children}
    </Link>
  );
}
