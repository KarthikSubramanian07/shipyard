"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleKudosAction } from "@/app/actions/fic";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/utils";

export function KudosButton({
  ficId,
  initialKudosed,
  initialCount,
  authed,
}: {
  ficId: string;
  initialKudosed: boolean;
  initialCount: number;
  authed: boolean;
}) {
  const router = useRouter();
  const [kudosed, setKudosed] = useState(initialKudosed);
  const [count, setCount] = useState(initialCount);
  const [pending, start] = useTransition();

  function onClick() {
    if (!authed) {
      router.push("/login");
      return;
    }
    const next = !kudosed;
    setKudosed(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    start(async () => {
      const res = await toggleKudosAction(ficId);
      setKudosed(res.kudosed);
    });
  }

  return (
    <Button variant={kudosed ? "verdigris" : "outline"} onClick={onClick} disabled={pending}>
      <Sparkles /> {kudosed ? "Kudos given" : "Give kudos"}
      {count > 0 ? <span className="tabular-nums">· {formatCount(count)}</span> : null}
    </Button>
  );
}
