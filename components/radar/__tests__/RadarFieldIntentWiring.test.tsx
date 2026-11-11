import { fireEvent, render, screen } from "@testing-library/react";

import { RadarCardView } from "../RadarCards";
import {
  routeRadarCardIntent,
  type RadarIntentScope,
} from "@/lib/my-path/radar-sync";

jest.mock("@/components/radar/OglTrendBackground", () => ({
  OglTrendBackground: () => null,
}));

function intentWiring() {
  const analytics = jest.fn();
  const canonical = jest.fn();
  return {
    analytics,
    canonical,
    onIntent(
      pathSlug: string,
      buttonLabel?: string,
      scope?: RadarIntentScope
    ) {
      routeRadarCardIntent({
        scope,
        buttonLabel,
        recordAnalytics: () => analytics(pathSlug, buttonLabel),
        recordCanonical: canonical,
      });
    },
  };
}

test("a start option remains raw Radar analytics only", () => {
  const wiring = intentWiring();
  render(
    <RadarCardView
      kind="text"
      accent="#60a5fa"
      content={{
        presentation: "startCarousel",
        title: "วิธีเริ่มทดลอง",
        options: [
          {
            title: "ลองทำโปรเจกต์สั้น",
            cta: "สนใจวิธีนี้",
          },
        ],
      }}
      onIntent={wiring.onIntent}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "สนใจวิธีนี้" }));

  expect(wiring.analytics).toHaveBeenCalledWith(
    "start-option-1",
    "interested"
  );
  expect(wiring.canonical).not.toHaveBeenCalled();
});

test("the final field CTA records analytics and canonical field intent", () => {
  const wiring = intentWiring();
  render(
    <RadarCardView
      kind="cta"
      accent="#60a5fa"
      content={{
        title: "ทางนี้เหมาะกับเราหรือไม่",
      }}
      onIntent={wiring.onIntent}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "สนใจสายนี้" }));

  expect(wiring.analytics).toHaveBeenCalledWith("interested", "interested");
  expect(wiring.canonical).toHaveBeenCalledWith("interested");
  // Recording interest never opens the old LINE QR dialog.
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByText(/นัดคุยกับรุ่นพี่/)).not.toBeInTheDocument();
});

test("the intent button records once, then shows it is saved", () => {
  const wiring = intentWiring();
  render(
    <RadarCardView
      kind="cta"
      accent="#60a5fa"
      content={{ title: "ทางนี้เหมาะกับเราหรือไม่" }}
      squadUrl="https://passionseed.org/paths/cyber-squad"
      onIntent={wiring.onIntent}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "สนใจสายนี้" }));
  fireEvent.click(screen.getByRole("button", { name: /บันทึกแล้ว/ }));

  expect(wiring.analytics).toHaveBeenCalledTimes(1);
  expect(wiring.analytics).toHaveBeenCalledWith("cyber-squad", "interested");
});
