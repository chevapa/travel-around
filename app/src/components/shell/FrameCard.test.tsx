// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FrameCard } from "./FrameCard";
import { _resetWikipediaPhotoCacheForTests } from "../../lib/wikipediaPhoto";

describe("FrameCard — fixed order: name -> print -> description -> drive time -> tags", () => {
  it("renders the name before the print/description/drive-time/tags in document order (MED 06 fix)", () => {
    const { container } = render(
      <FrameCard
        name="Sveti Križ Začretje"
        state="loved"
        src="photo.jpg"
        description="A restored manor house."
        driveTime="52 min"
        distance="49 km"
        tags={["Croatia", "Castle"]}
      />,
    );
    const text = container.textContent ?? "";
    const nameIdx = text.indexOf("Sveti Križ Začretje");
    const descIdx = text.indexOf("A restored manor house");
    const driveIdx = text.indexOf("52 min");
    const tagIdx = text.indexOf("Croatia");
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(driveIdx);
    expect(driveIdx).toBeLessThan(tagIdx);
  });

  it("never puts a tag above the name — the live site's original mistake", () => {
    const { container } = render(<FrameCard name="Krapina" tags={["Croatia"]} />);
    const h3 = container.querySelector("h3");
    expect(h3?.textContent).toBe("Krapina");
    // the h3 is the first meaningful content node in the card body
    const body = h3?.parentElement?.parentElement;
    expect(body?.firstElementChild).toBe(h3?.parentElement);
  });
});

describe("FrameCard — Similar places is not variant=primary (Task 8 fix: TopBar already owns the one screen-wide primary)", () => {
  it("renders Similar places with the accent (pink) fill, not the primary (yellow) one", () => {
    render(<FrameCard name="Krapina" state="loved" src="p.jpg" onNearby={() => {}} />);
    const button = screen.getByText("Similar places →");
    expect(button.getAttribute("style")).toContain("var(--action-accent)");
    expect(button.getAttribute("style")).not.toContain("var(--action-primary)");
  });
});

describe("FrameCard — unprinted state", () => {
  it("shows the blank-frame placeholder, not a photo, when no category image is available", () => {
    const { container } = render(<FrameCard name="Ozalj" state="unprinted" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/not visited/)).toBeInTheDocument();
  });

  it("shows the given image instead of the placeholder when one is available (issue 122)", () => {
    const { container } = render(<FrameCard name="Ozalj" state="unprinted" src="category-nature.png" />);
    expect(screen.queryByText(/not visited/)).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("category-nature.png");
  });
});

describe("FrameCard — tags are a click-to-filter control (issue 128)", () => {
  it("calls onTagClick with the clicked tag", async () => {
    const user = userEvent.setup();
    const onTagClick = vi.fn();
    render(<FrameCard name="Krapina" tags={["nature", "castle"]} onTagClick={onTagClick} />);
    await user.click(screen.getByText("castle"));
    expect(onTagClick).toHaveBeenCalledWith("castle");
  });

  it("marks the active tag so the applied filter is visible", () => {
    render(<FrameCard name="Krapina" tags={["nature", "castle"]} activeTag="castle" onTagClick={() => {}} />);
    expect(screen.getByText("castle").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("nature").getAttribute("aria-pressed")).toBe("false");
  });

  it("renders plain, non-interactive tags when onTagClick is absent", () => {
    render(<FrameCard name="Krapina" tags={["nature"]} />);
    expect(screen.queryByRole("button", { name: "nature" })).toBeNull();
  });
});

// Issue 145: country and season as their own clickable filter badges, same
// pattern as issue 128's category tags.
describe("FrameCard — country and season badges (issue 145)", () => {
  it("shows a country badge that calls onCountryClick when clicked", async () => {
    const user = userEvent.setup();
    const onCountryClick = vi.fn();
    render(<FrameCard name="Krapina" country="hr" onCountryClick={onCountryClick} />);
    await user.click(screen.getByText("HR"));
    expect(onCountryClick).toHaveBeenCalledWith("hr");
  });

  it("marks the country badge active when it matches activeCountry", () => {
    render(<FrameCard name="Krapina" country="hr" activeCountry="hr" onCountryClick={() => {}} />);
    expect(screen.getByText("HR").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a season badge that calls onSeasonClick when clicked", async () => {
    const user = userEvent.setup();
    const onSeasonClick = vi.fn();
    render(<FrameCard name="Krapina" season="summer" onSeasonClick={onSeasonClick} />);
    await user.click(screen.getByText("Summer / swimming"));
    expect(onSeasonClick).toHaveBeenCalledWith("summer");
  });

  it("never shows a season badge for 'all' (year-round), matching the live site", () => {
    render(<FrameCard name="Krapina" season="all" onSeasonClick={() => {}} />);
    expect(screen.queryByText("Year-round")).toBeNull();
  });

  it("renders no badges row at all when neither country, season, nor tags are set", () => {
    const { container } = render(<FrameCard name="Krapina" />);
    expect(container.querySelector('[role="button"]')).toBeNull();
  });
});

describe("FrameCard — name links to a web search when searchUrl is given (issue 109 checklist)", () => {
  it("wraps the name in a link to searchUrl", () => {
    render(<FrameCard name="Krapina" searchUrl="https://www.google.com/search?q=Krapina" />);
    const link = screen.getByRole("link", { name: "Krapina" });
    expect(link).toHaveAttribute("href", "https://www.google.com/search?q=Krapina");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders a plain heading, no link, when searchUrl is absent", () => {
    render(<FrameCard name="Krapina" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("FrameCard — actions", () => {
  it("calls onClose, onNearby, onToPrint, onRoute", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNearby = vi.fn();
    const onToPrint = vi.fn();
    const onRoute = vi.fn();
    render(<FrameCard name="Krapina" state="loved" src="p.jpg" onClose={onClose} onNearby={onNearby} onToPrint={onToPrint} onRoute={onRoute} />);
    await user.click(screen.getByLabelText("Close frame"));
    expect(onClose).toHaveBeenCalled();
    await user.click(screen.getByText("Similar places →"));
    expect(onNearby).toHaveBeenCalled();
    await user.click(screen.getByText(/Want to go/));
    expect(onToPrint).toHaveBeenCalled();
    await user.click(screen.getByText(/Route/));
    expect(onRoute).toHaveBeenCalled();
  });
});

// Issue 155: "it's written like 40 minutes on the card, but I cannot
// understand like 40 minutes for what" — a bare duration read as ambiguous.
describe("FrameCard — drive time is labelled, not a bare duration (issue 155)", () => {
  it("prefixes the drive time with 'Drive' so the number reads as a duration by car", () => {
    render(<FrameCard name="Krapina" driveTime="40 min" distance="38 km" />);
    expect(screen.getByText("Drive 40 min · 38 km")).toBeInTheDocument();
    expect(screen.queryByText("40 min · 38 km")).toBeNull();
  });
});

// Issue 155: "I saw pictures that are publicly available on Wikipedia...
// it's not allowed at all so I'm expecting you to fix that."
describe("FrameCard — real Wikipedia photo (issue 155)", () => {
  beforeEach(() => {
    _resetWikipediaPhotoCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("swaps in the resolved Wikipedia photo once it loads, replacing the placeholder src", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "standard", thumbnail: { source: "https://example.com/krapina.jpg" } }),
      } as Response),
    );
    render(<FrameCard name="Krapina" state="loved" src="placeholder.jpg" wikiQuery="Krapina" />);
    // Placeholder shows first, before the fetch resolves.
    expect(screen.getByAltText("Krapina")).toHaveAttribute("src", "placeholder.jpg");
    await waitFor(() => expect(screen.getByAltText("Krapina")).toHaveAttribute("src", "https://example.com/krapina.jpg"));
  });

  it("keeps the placeholder when the Wikipedia lookup finds nothing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
    render(<FrameCard name="Obscure Place" state="loved" src="placeholder.jpg" wikiQuery="Obscure Place" />);
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(screen.getByAltText("Obscure Place")).toHaveAttribute("src", "placeholder.jpg");
  });

  it("shows a resolved Wikipedia photo instead of the hatch placeholder for an unprinted frame with no category art", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ type: "standard", thumbnail: { source: "https://example.com/somewhere.jpg" } }),
      } as Response),
    );
    render(<FrameCard name="Somewhere New" state="unprinted" wikiQuery="Somewhere New" />);
    expect(screen.getByText(/not visited/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("Somewhere New")).toHaveAttribute("src", "https://example.com/somewhere.jpg"));
    expect(screen.queryByText(/not visited/)).toBeNull();
  });

  it("does not fetch at all when wikiQuery is omitted (a curated photo already exists)", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<FrameCard name="Krapina" state="loved" src="curated.jpg" />);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// Issue 144: Frame.warn existed in the model but the card never rendered it.
describe("FrameCard — 'check before you go' warning (issue 144)", () => {
  it("shows the warn text, labelled, when set", () => {
    render(<FrameCard name="Vukovar" warn="Reconstruction ongoing; closed Mondays." />);
    expect(screen.getByText("Check before you go")).toBeInTheDocument();
    expect(screen.getByText("Reconstruction ongoing; closed Mondays.")).toBeInTheDocument();
  });

  it("renders nothing extra when warn is unset", () => {
    render(<FrameCard name="Vukovar" />);
    expect(screen.queryByText("Check before you go")).toBeNull();
  });
});

describe("FrameCard — accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <FrameCard name="Krapina" state="loved" src="p.jpg" description="Nice." driveTime="52 min" tags={["Croatia"]} onClose={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
