import { PassionSeedMark } from "../riso";

import {
  Hook,
  JoinStrip,
  Lockup,
  PriceCard,
  StatusPill,
  StoryJoinStrip,
  WhenCard,
  WhoChips,
  cosmosBackground,
} from "./parts";
import { PlanetScene } from "./PlanetScene";
import { Sky } from "./Sky";

/**
 * SHIFT[3] launch poster, cosmos style: the SHIFT planet with Bangkok lit,
 * a rocket leaving it, the SHIFT[3] lockup and one outcome hook, then the
 * facts on clear glass. Feed 1080x1350 and Story 1080x1920 (the story keeps
 * its top 220px and bottom 340px free of anything that must be read, for the
 * Instagram UI). Every fact comes from SHIFT_COHORT_3 via ./facts.
 * Export: screenshot #shift3-launch-feed and #shift3-launch-story.
 */

export const SHIFT3_LAUNCH_FEED_ID = "shift3-launch-feed";
export const SHIFT3_LAUNCH_STORY_ID = "shift3-launch-story";

export function Shift3LaunchFeed() {
  return (
    <div
      id={SHIFT3_LAUNCH_FEED_ID}
      lang="th"
      className="relative h-[1350px] w-[1080px] shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={cosmosBackground(1080, 1350)}
    >
      <Sky width={1080} height={1350} seed={3} band={[0, 1180, 1080, 640]} />
      <PlanetScene
        layout="feed"
        orbit={{ rx: 340, ry: 76, tilt: -16 }}
        rocket={{ x: 1000, y: 196, angle: 30, scale: 0.58, curve: [905, 320, 930, 290] }}
      />
      <div className="relative flex h-full flex-col px-[60px] pb-[52px] pt-[44px]">
        <div className="flex items-center justify-between">
          <PassionSeedMark size={42} />
          <StatusPill>เปิดรับสมัครแล้ว</StatusPill>
        </div>
        <div className="mt-[48px]">
          <Hook big={70} small={34} />
        </div>
        <h1 className="-ml-[8px] mt-[26px]">
          <Lockup size={226} />
        </h1>
        <div className="mt-[34px]">
          <WhoChips />
        </div>
        <div className="mt-auto space-y-[18px]">
          <div className="flex gap-[18px]">
            <WhenCard className="flex-1" />
            <PriceCard className="w-[372px] shrink-0" />
          </div>
          <JoinStrip />
        </div>
      </div>
    </div>
  );
}

export function Shift3LaunchStory() {
  return (
    <div
      id={SHIFT3_LAUNCH_STORY_ID}
      lang="th"
      className="relative h-[1920px] w-[1080px] shrink-0 overflow-hidden font-bai-jamjuree antialiased"
      style={cosmosBackground(1080, 1920)}
    >
      <Sky width={1080} height={1920} seed={5} band={[0, 1780, 1080, 1080]} />
      <PlanetScene
        layout="story"
        orbit={{ rx: 470, ry: 104, tilt: -16 }}
        rocket={{ x: 960, y: 118, angle: 48, scale: 0.66, curve: [640, 150, 790, 120] }}
      />
      {/* Key info lives between y=220 and y=1580; the rest is sky. */}
      <div className="absolute inset-x-0 top-[220px] flex h-[1360px] flex-col px-[64px] pb-[8px] pt-[20px]">
        <PassionSeedMark size={46} />
        <div className="mt-[18px]">
          <StatusPill k={1.05}>เปิดรับสมัครแล้ว</StatusPill>
        </div>
        <h1 className="-ml-[8px] mt-auto">
          <Lockup size={246} />
        </h1>
        <div className="mt-[34px]">
          <Hook k={1} big={76} small={38} />
        </div>
        <div className="mt-[40px] space-y-[18px]">
          <div className="flex gap-[18px]">
            <WhenCard className="flex-1" />
            <PriceCard className="w-[372px] shrink-0" />
          </div>
          <StoryJoinStrip />
        </div>
      </div>
    </div>
  );
}
