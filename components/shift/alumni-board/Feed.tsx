"use client";

import { useState } from "react";

import { addPostAction, deletePostAction, reactAction } from "@/app/shift/alumni/board/actions";
import { formatBangkok, linkHost } from "@/lib/shift/alumniBoard";
import type { FeedPost } from "@/lib/supabase/shift-alumni-board/feed";

import board from "./board.module.css";
import { useBoardAction } from "./useBoardAction";

export function PostForm() {
  const { pending, run } = useBoardAction();
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  return (
    <section className={board.card}>
      <h1 className={board.title}>📣 ความคืบหน้า</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addPostAction(body, link),
            () => {
              setBody("");
              setLink("");
            },
          );
        }}
      >
        <label className={board.label} htmlFor="post-body">
          วันนี้คืบหน้าอะไร?{" "}
          <span className={board.hint}>ทำอะไรไป เจออะไร ติดตรงไหน · อย่าใส่ชื่อหรือข้อมูลส่วนตัวของคนอื่น</span>
        </label>
        <textarea
          id="post-body"
          className={board.input}
          required
          maxLength={500}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <label className={board.label} htmlFor="post-link">
          ลิงก์ <span className={board.hint}>ไม่ใส่ก็ได้ · http:// หรือ https:// เท่านั้น</span>
        </label>
        <input
          id="post-link"
          type="url"
          inputMode="url"
          className={board.input}
          maxLength={500}
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button type="submit" className={`${board.button} mt-4`} disabled={pending}>
          โพสต์
        </button>
      </form>
    </section>
  );
}

function PostActions({ post }: { post: FeedPost }) {
  const { pending, run } = useBoardAction();
  return (
    <div className={`${board.row} mt-3`}>
      {post.reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={`${board.ghost} ${board.small}`}
          aria-pressed={r.mine}
          disabled={pending}
          onClick={() => run(() => reactAction(post.id, r.emoji))}
        >
          {r.emoji} {r.count || ""}
        </button>
      ))}
      {post.canDelete && (
        <button
          type="button"
          className={`${board.ghost} ${board.small} ml-auto`}
          disabled={pending}
          onClick={() => {
            if (window.confirm("ลบโพสต์นี้?")) run(() => deletePostAction(post.id));
          }}
        >
          ลบ
        </button>
      )}
    </div>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article id={`post-${post.id}`} className={board.card}>
      <p>
        <b>{post.name}</b>
        {post.team && <span className={board.muted}> · {post.team}</span>}
        <span className={board.muted}> · {formatBangkok(post.created_at)}</span>
      </p>
      <p className={`${board.pre} mt-2`}>{post.body}</p>
      {post.link && (
        <a href={post.link} target="_blank" rel="noopener noreferrer nofollow" className={`${board.link} mt-2 inline-block`}>
          🔗 {linkHost(post.link) || "ลิงก์"}
        </a>
      )}
      <PostActions post={post} />
    </article>
  );
}
