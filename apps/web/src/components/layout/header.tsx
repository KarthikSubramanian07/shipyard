import { Bell, Compass, PenLine } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/services/notifications";
import { SearchBox } from "@/components/search-box";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(getDb(), user.id) : 0;

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" aria-label="Shipyard home">
          <Logo textClassName="hidden sm:inline" />
        </Link>

        <nav className="ml-2 hidden md:flex">
          <Link
            href="/discover"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <Compass className="size-4" /> Discover
          </Link>
        </nav>

        <div className="mx-auto w-full max-w-md">
          <SearchBox />
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
                <Link href="/write" aria-label="Write a fic">
                  <PenLine />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/notifications" aria-label="Notifications">
                  <Bell />
                  {unread > 0 && (
                    <span className="bg-primary text-primary-foreground absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Join</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
