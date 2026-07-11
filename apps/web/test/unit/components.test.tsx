import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FicCard } from "@/components/fic-card";
import { WorkCard } from "@/components/work-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingSummary, Stars } from "@/components/ui/star-rating";

describe("RatingSummary", () => {
  it("shows an unrated state", () => {
    render(<RatingSummary average={null} count={0} />);
    expect(screen.getByText("Not yet rated")).toBeInTheDocument();
  });

  it("shows the average and count", () => {
    render(<RatingSummary average={4.2} count={1200} />);
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("(1,200)")).toBeInTheDocument();
  });
});

describe("Stars", () => {
  it("labels itself accessibly", () => {
    render(<Stars stars={3.5} />);
    expect(screen.getByLabelText("3.5 out of 5 stars")).toBeInTheDocument();
  });
});

describe("Badge & Button", () => {
  it("renders badge content", () => {
    render(<Badge variant="flare">angst</Badge>);
    expect(screen.getByText("angst")).toBeInTheDocument();
  });

  it("renders a button with brand styling", () => {
    render(<Button>Log or rate</Button>);
    const btn = screen.getByRole("button", { name: "Log or rate" });
    expect(btn.className).toContain("bg-primary");
  });
});

describe("WorkCard", () => {
  it("links to the work page", () => {
    render(
      <WorkCard work={{ slug: "dune-2021", title: "Dune", year: 2021, posterUrl: null, type: "film" }} />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/work/dune-2021");
    expect(screen.getAllByText("Dune").length).toBeGreaterThan(0);
    expect(screen.getByText("2021")).toBeInTheDocument();
  });
});

describe("FicCard", () => {
  it("renders title, type and length badges", () => {
    render(
      <FicCard
        fic={{
          slug: "my-fic-abc123",
          title: "The Ending It Deserved",
          summary: "What if they lived?",
          type: "alternate-ending",
          rating: "teen",
          canon: "canon-divergent",
          wordCount: 5000,
          chapterCount: 2,
          kudosCount: 42,
          isComplete: false,
          author: { username: "fan", displayName: "A Fan", avatarKey: null },
        }}
      />,
    );
    expect(screen.getByText("The Ending It Deserved")).toBeInTheDocument();
    expect(screen.getByText("Alternate ending")).toBeInTheDocument();
    expect(screen.getByText("short")).toBeInTheDocument();
    expect(screen.getByText("WIP")).toBeInTheDocument();
  });
});
