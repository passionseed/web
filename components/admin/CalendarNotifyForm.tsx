"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveCalendarNotify, sendDiscordTest } from "@/app/admin/calendar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bangkokInstant } from "@/lib/calendar/core";
import { REMIND_CHOICES, fillTemplate, type NotifySettingsView } from "@/lib/calendar/notify";

const SAMPLE = {
  title: "นั่งทำโปรเจกต์ด้วยกัน",
  startsAt: bangkokInstant("2026-10-31", "19:00"),
  endsAt: bangkokInstant("2026-10-31", "20:00"),
  place: "Discord ห้อง 2",
};

export function CalendarNotifyForm({ initial }: { initial: NotifySettingsView }) {
  const [igGroupUrl, setIgGroupUrl] = useState(initial.igGroupUrl ?? "");
  const [template, setTemplate] = useState(initial.template);
  const [webhook, setWebhook] = useState<string | undefined>(undefined);
  const [onCreate, setOnCreate] = useState(initial.discordOnCreate);
  const [remind, setRemind] = useState<number[]>(initial.remindMinutes);
  const [configured, setConfigured] = useState(initial.discordConfigured);
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();

  const save = () =>
    startSave(async () => {
      const result = await saveCalendarNotify({
        igGroupUrl,
        template,
        discordWebhookUrl: webhook,
        discordOnCreate: onCreate,
        remindMinutes: remind,
      });
      if (!result.ok) return void toast.error(result.error);
      if (webhook !== undefined) setConfigured(webhook !== "");
      setWebhook(undefined);
      toast.success("Saved");
    });

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Instagram group</h3>
          <p className="text-xs text-muted-foreground">
            Instagram has no API for group chats, so nothing is posted automatically. After adding a block, people get a
            &quot;แชร์ลงกลุ่ม IG&quot; button: on a phone it opens the share sheet (pick Instagram, then the group); on a
            computer it copies the message and opens the group below.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ig">Group chat link</Label>
          <Input
            id="ig"
            value={igGroupUrl}
            onChange={(e) => setIgGroupUrl(e.target.value)}
            placeholder="https://www.instagram.com/direct/t/1234567890/"
          />
          <p className="text-xs text-muted-foreground">
            Open the group on instagram.com and copy the address. It only opens for people already in the group, so it is
            safe to show. Don&apos;t use a join link (ig.me/j/…): anyone signed in would see it.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl">Message</Label>
          <Textarea id="tpl" rows={5} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Fills in {"{title}"} {"{when}"} {"{place}"} {"{link}"}. A line whose placeholder is empty is left out.
          </p>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
            {fillTemplate(template, SAMPLE, "https://www.passionseed.org/calendar?block=…")}
          </pre>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Discord</h3>
          <p className="text-xs text-muted-foreground">
            Posts to one channel automatically. In Discord: channel settings → Integrations → Webhooks → New Webhook →
            Copy URL. Nobody gets pinged.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hook">Webhook URL</Label>
          {configured && webhook === undefined ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Connected (…{initial.discordHint})</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setWebhook("")}>
                Replace or remove
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={testing}
                onClick={() =>
                  startTest(async () => {
                    const { ok } = await sendDiscordTest();
                    toast[ok ? "success" : "error"](ok ? "Sent a test message" : "Discord didn't accept it. Check the webhook.");
                  })
                }
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send test"}
              </Button>
            </div>
          ) : (
            <Input
              id="hook"
              type="password"
              autoComplete="off"
              value={webhook ?? ""}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…  (leave empty to turn Discord off)"
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onCreate} onChange={(e) => setOnCreate(e.target.checked)} />
          Post when someone adds a block
        </label>
        <div className="space-y-1.5">
          <p className="text-sm">Reminders</p>
          <div className="flex flex-wrap gap-3">
            {REMIND_CHOICES.map((c) => (
              <label key={c.minutes} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={remind.includes(c.minutes)}
                  onChange={(e) =>
                    setRemind((r) => (e.target.checked ? [...r, c.minutes] : r.filter((m) => m !== c.minutes)))
                  }
                />
                {c.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Checked every 5 minutes, so a reminder can be up to 5 minutes late.</p>
        </div>
      </section>

      <Button type="button" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
      {initial.updatedAt && (
        <p className="text-xs text-muted-foreground">Last saved {new Date(initial.updatedAt).toLocaleString("en-GB")}</p>
      )}
    </div>
  );
}
