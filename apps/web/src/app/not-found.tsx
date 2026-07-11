import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <LogoMark className="size-12" />
      <h1 className="font-display mt-6 text-3xl font-semibold">Lost at sea</h1>
      <p className="text-muted-foreground mt-2">
        This page slipped its moorings. Let&apos;s get you back to the harbor.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
