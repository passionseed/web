"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useTransform } from "framer-motion";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import styles from "./elemental-cinema.module.css";
import { TEASER_4X5_START_S, TEASER_MEDIA } from "./media";
import { useElementalSound } from "./sound-context";
import { useSectionScroll } from "./use-section-scroll";

const VIDEO_ID = "teaser";

export function TeaserScreening({ joinHref, open }: { joinHref: string; open: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  const {
    soundOn,
    audioUnlocked,
    activeAudioId,
    markAudioUnlocked,
    activateVideoWithSound,
    reportVisibility,
  } = useElementalSound();

  const [isPortraitScreen, setIsPortraitScreen] = useState(false);
  const [nearViewport, setNearViewport] = useState(false);
  const [ended, setEnded] = useState(false);
  const hasPlayedInViewRef = useRef(false);

  const scrollYProgress = useSectionScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Apple-style entrance scale + counter-parallax headline
  const videoScale = useTransform(scrollYProgress, [0, 0.35, 0.72, 1], [0.92, 1, 1, 0.96]);
  const copyY = useTransform(scrollYProgress, [0.1, 0.9], [72, -72]);

  useEffect(() => {
    const mq = window.matchMedia("(max-aspect-ratio: 3/4)");
    setIsPortraitScreen(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsPortraitScreen(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const videoSrc = isPortraitScreen ? TEASER_MEDIA.video9x16 : TEASER_MEDIA.video4x5;
  const posterSrc = isPortraitScreen ? TEASER_MEDIA.poster9x16 : TEASER_MEDIA.poster4x5;
  // Start past the 4:5 file's black opening so the teaser plays straight onto picture.
  const startAt = isPortraitScreen ? 0 : TEASER_4X5_START_S;

  // Lazy loading: nothing until the teaser is about half a screen away, then
  // only the poster and the video's header. The 5 to 8 MB video itself streams
  // when it starts playing (55% in view), so visitors who never reach it
  // download none of it.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const preloader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          preloader.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    preloader.observe(section);
    return () => preloader.disconnect();
  }, []);

  // Sync mute state with global default-on sound winner + browser gesture unlock
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const shouldPlayAudible = soundOn && audioUnlocked && activeAudioId === VIDEO_ID;
    video.muted = !shouldPlayAudible;
    if (shouldPlayAudible && hasPlayedInViewRef.current && video.paused && !ended) {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, [soundOn, audioUnlocked, activeAudioId, ended]);

  // Play from 0 when >=55% in view; attempt unmuted first (default sound ON), fall back to muted until first gesture.
  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        reportVisibility(VIDEO_ID, entry.intersectionRatio);
        if (reduceMotion) return;

        if (entry.intersectionRatio >= 0.55 && !hasPlayedInViewRef.current) {
          hasPlayedInViewRef.current = true;
          setEnded(false);
          video.currentTime = startAt;
          video.muted = !soundOn;
          video
            .play()
            .then(() => {
              if (!video.muted) markAudioUnlocked();
            })
            .catch(() => {
              video.muted = true;
              video.play().catch(() => {});
            });
        } else if (entry.intersectionRatio === 0) {
          video.pause();
          video.currentTime = startAt;
          hasPlayedInViewRef.current = false;
          setEnded(false);
        }
      },
      { threshold: [0, 0.2, 0.4, 0.55, 0.8] }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      reportVisibility(VIDEO_ID, 0);
    };
  }, [reduceMotion, reportVisibility, soundOn, markAudioUnlocked, videoSrc, startAt]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;
    activateVideoWithSound(VIDEO_ID);
    setEnded(false);
    video.muted = false;
    video.currentTime = startAt;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLVideoElement>) => {
    if (e.key === " " || e.key.toLowerCase() === "k") {
      e.preventDefault();
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    }
  };

  return (
    <section
      ref={sectionRef}
      id="teaser"
      className="relative flex min-h-[115svh] w-full flex-col justify-center overflow-hidden bg-[#0c0d0c] py-8 md:py-0"
    >
      <div className="relative flex w-full flex-col md:flex-row md:items-center">
        {/* Sharp full-height video column with gentle Apple scale reveal */}
        <motion.div
          style={reduceMotion ? undefined : { scale: videoScale }}
          className={`will-change-transform ${isPortraitScreen ? "w-full" : "relative md:ml-[8vw]"}`}
        >
          <video
            key={videoSrc}
            ref={videoRef}
            src={startAt ? `${videoSrc}#t=${startAt}` : videoSrc}
            poster={nearViewport ? posterSrc : undefined}
            muted={!soundOn}
            playsInline
            preload={nearViewport ? "metadata" : "none"}
            tabIndex={0}
            aria-label="ทีเซอร์ Elemental Hackathon คลิกเพื่อเล่นใหม่พร้อมเสียง กด Space หรือ K เพื่อหยุด"
            onClick={handleVideoClick}
            onKeyDown={handleKeyDown}
            onEnded={() => setEnded(true)}
            className={
              isPortraitScreen
                ? "block h-[100svh] w-full cursor-pointer object-cover"
                : `${styles.mediaColumn} cursor-pointer`
            }
          />

          {/* Payoff CTA fades in beneath the column once the teaser finishes on the poster frame */}
          {open && (
            <div
              className={`px-5 py-6 transition-opacity duration-700 md:px-0 ${
                ended ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <Link
                href={joinHref}
                className={`${styles.textLink} text-2xl italic`}
                style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.flameCore }}
              >
                สมัคร →
              </Link>
            </div>
          )}
        </motion.div>

        {/* Counter-parallax editorial hook beside the full teaser (crisp contrast on solid black) */}
        <motion.div
          style={reduceMotion ? undefined : { y: copyY }}
          className="pointer-events-none z-10 px-5 py-10 will-change-transform md:ml-10 md:px-0 md:pr-10 md:py-0 lg:ml-14"
        >
          <h2
            className="text-[#faf8f4]"
            style={{
              fontFamily: EL_FONT.display,
              fontSize: "clamp(2.2rem, 4.4vw, 4.4rem)",
              fontWeight: 200,
              lineHeight: 1.15,
            }}
          >
            <span className="block">หาทางออกให้ธรรมชาติ</span>
            <span className="block italic" style={{ fontWeight: 300, color: EL.flameCore }}>
              ก่อนมันจะให้เราออก
            </span>
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
