"use client";

import { useId, useState, useTransition, type FormEvent, type Ref } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createProject, respondInvite } from "@/app/shift/island/actions";
import { PROJECT_ROUTES, TEXT_LIMITS, type ProjectInvite, type ProjectRoute } from "@/lib/supabase/shift-quests/types";

import { COMMON, DETAIL, NO_PROJECT, ROUTE_NAMES } from "./copy";
import styles from "./island.module.css";
import { IslandDiscordButton } from "./IslandDiscordButton";
import { Field } from "./SubmitForm";

/** The claim form's anchor. */
export const CLAIM_FORM_ID = "island-claim";

interface NoProjectProps {
  invites: ProjectInvite[];
  /** The project name field, so the sheet can focus it when it opens. */
  nameInput?: Ref<HTMLInputElement>;
  /** The invites' heading, focusable so the claim sheet can open on the invites without a keyboard. */
  invitesHeading?: Ref<HTMLHeadingElement>;
}

/**
 * No plot yet, inside the claim sheet over the island: pending invites first,
 * then claiming a plot with a new project.
 */
export function NoProject({ invites, nameInput, invitesHeading }: NoProjectProps) {
  return (
    <div className={styles.noProject}>
      {invites.length > 0 ? <Invites invites={invites} heading={invitesHeading} /> : null}
      <CreateProject nameInput={nameInput} />
      <p className={styles.hint}>{NO_PROJECT.joinFriend}</p>
      <IslandDiscordButton label={NO_PROJECT.switchAccount} switchAccount variant="quiet" />
    </div>
  );
}

function Invites({ invites, heading }: { invites: ProjectInvite[]; heading?: Ref<HTMLHeadingElement> }) {
  return (
    <section className={`ei-card ei-card--static ${styles.card}`} aria-labelledby="island-invites-heading">
      <h2 id="island-invites-heading" ref={heading} tabIndex={-1} className={styles.sectionHeading}>
        {NO_PROJECT.invitesHeading}
      </h2>
      <ul className={styles.invites}>
        {invites.map((invite) => (
          <InviteRow key={invite.projectId} invite={invite} />
        ))}
      </ul>
    </section>
  );
}

function InviteRow({ invite }: { invite: ProjectInvite }) {
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    if (pending) return;
    startTransition(async () => {
      const result = await respondInvite({ projectId: invite.projectId, accept });
      if (result.ok) toast.success(accept ? NO_PROJECT.joined : NO_PROJECT.passed);
      else toast.error(result.error || COMMON.failed);
    });
  }

  return (
    <li className={styles.invite}>
      <p className={styles.inviteTitle}>{NO_PROJECT.invite(invite.name)}</p>
      <p className={styles.hint}>
        {ROUTE_NAMES[invite.route] ?? invite.route}
        {invite.inviter ? ` · ${NO_PROJECT.invitedBy(invite.inviter)}` : ""}
      </p>
      <div className={styles.inviteActions}>
        <button type="button" className={`ei-button-dawn ${styles.primary}`} disabled={pending} onClick={() => respond(true)}>
          <span>{NO_PROJECT.accept}</span>
        </button>
        <button type="button" className={styles.quietButton} disabled={pending} onClick={() => respond(false)}>
          {NO_PROJECT.decline}
        </button>
      </div>
    </li>
  );
}

function CreateProject({ nameInput }: { nameInput?: Ref<HTMLInputElement> }) {
  const nameId = useId();
  const ambitionId = useId();
  const routeName = useId();
  const [name, setName] = useState("");
  const [route, setRoute] = useState<ProjectRoute | null>(null);
  const [ambition, setAmbition] = useState("");
  const [errors, setErrors] = useState<{ name?: string; route?: string; ambition?: string }>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const title = name.trim();
    const goal = ambition.trim();
    const found: typeof errors = {};
    if (!title) found.name = NO_PROJECT.nameRequired;
    else if (title.length > TEXT_LIMITS.projectName) found.name = DETAIL.errors.tooLong(TEXT_LIMITS.projectName);
    if (!route) found.route = NO_PROJECT.routeRequired;
    if (goal.length > TEXT_LIMITS.ambition) found.ambition = DETAIL.errors.tooLong(TEXT_LIMITS.ambition);
    setErrors(found);
    if (Object.values(found).some(Boolean) || !route) return;
    startTransition(async () => {
      const result = await createProject({ name: title, route, ambition: goal ? goal : null });
      if (result.ok) toast.success(NO_PROJECT.created);
      else toast.error(result.error || COMMON.failed);
    });
  }

  return (
    // The sheet's title already says จับจองที่ดินบนเกาะ; the section keeps it as its name.
    <section id={CLAIM_FORM_ID} className={styles.claim} aria-label={NO_PROJECT.heading}>
      <p className={styles.gateBody}>{NO_PROJECT.body}</p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor={nameId} className={styles.label}>
            {NO_PROJECT.nameLabel}
          </label>
          <input
            ref={nameInput}
            id={nameId}
            className={`ei-input ${styles.input}`}
            value={name}
            maxLength={TEXT_LIMITS.projectName}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            onChange={(event) => {
              setName(event.target.value);
              if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
            }}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} role="alert" className={styles.fieldError}>
              {errors.name}
            </p>
          ) : null}
        </div>
        <fieldset className={styles.choices}>
          <legend className={styles.label}>{NO_PROJECT.routeLabel}</legend>
          <div className={styles.routePicker}>
            {PROJECT_ROUTES.map((value) => (
              <label key={value} className={styles.routeOption} data-checked={route === value ? "true" : undefined}>
                <input
                  type="radio"
                  name={routeName}
                  value={value}
                  checked={route === value}
                  className={styles.choiceInput}
                  onChange={() => {
                    setRoute(value);
                    if (errors.route) setErrors((current) => ({ ...current, route: undefined }));
                  }}
                />
                <span>{ROUTE_NAMES[value]}</span>
              </label>
            ))}
          </div>
          {errors.route ? (
            <p role="alert" className={styles.fieldError}>
              {errors.route}
            </p>
          ) : null}
        </fieldset>
        <Field
          id={ambitionId}
          label={NO_PROJECT.ambitionLabel}
          value={ambition}
          max={TEXT_LIMITS.ambition}
          error={errors.ambition}
          rows={3}
          onChange={(value) => {
            setAmbition(value);
            if (errors.ambition) setErrors((current) => ({ ...current, ambition: undefined }));
          }}
        />
        <button type="submit" className={`ei-button-dawn ${styles.primary}`} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{NO_PROJECT.action}</span>
        </button>
      </form>
    </section>
  );
}
