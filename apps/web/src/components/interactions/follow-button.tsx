"use client";

import { Check, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function FollowButton({
  targetUserId,
  initialFollowing,
  authed,
}: {
  targetUserId: string;
  initialFollowing: boolean;
  authed: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, start] = useTransition();

  function onClick() {
    if (!authed) {
      router.push("/login");
      return;
    }
    const next = !following;
    setFollowing(next);
    start(async () => {
      const res = await toggleFollowAction(targetUserId);
      setFollowing(res.following);
    });
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {following ? (
        <>
          <Check /> Following
        </>
      ) : (
        <>
          <UserPlus /> Follow
        </>
      )}
    </Button>
  );
}
