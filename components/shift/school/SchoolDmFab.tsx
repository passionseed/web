"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import { SCHOOL_CONTACT, SCHOOL_CONTACT_LINKS } from "@/lib/content/shift-school";

import styles from "./shiftSchool.module.css";

interface SchoolDmFabProps {
  /** id of the closing contact section; the pill steps aside while it is in view. */
  contactId: string;
}

/**
 * Keeps the one door within thumb reach once the hero scrolls away, and
 * hides while the closing contact section (with full-size CTAs) is visible.
 * Same contract as PartnerDmFab, styled in SHIFT ink.
 */
export function SchoolDmFab({ contactId }: SchoolDmFabProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let pastHero = false;
    let contactInView = false;
    const update = () => setVisible(pastHero && !contactInView);

    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.9;
      update();
    };

    const contact = document.getElementById(contactId);
    const observer = contact
      ? new IntersectionObserver((entries) => {
          contactInView = entries[0]?.isIntersecting ?? false;
          update();
        })
      : null;
    if (contact && observer) observer.observe(contact);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [contactId]);

  return (
    <a
      href={SCHOOL_CONTACT_LINKS.igDm}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.fab}
      data-visible={visible}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <MessageCircle aria-hidden="true" />
      <span>{SCHOOL_CONTACT.fab}</span>
    </a>
  );
}
