// client/src/components/ThreadCard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  addComment as addCommentApi,
  listComments,
  vote,
  Comment,
  Thread,
} from "../api/community";
import styles from "./ThreadCard.module.css";

// Helper to get current theme
const getTheme = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" ? "light" : "dark";
};

type Author = { id?: string; username?: string; avatarColor?: string; email?: string };

function Avatar({ author, size = 28 }: { author?: Author; size?: number }) {
  const color = author?.avatarColor || "#6E85B7";
  const label = (author?.username || "user").slice(0, 1).toUpperCase();
  return (
    <div
      title={author?.username || "user"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.45,
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
}

export default function ThreadCard({ t }: { t: Thread }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [threadData, setThreadData] = useState(t);
  const [counts, setCounts] = useState({ up: threadData.up || 0, down: threadData.down || 0 });
  const [theme, setTheme] = useState<"dark" | "light">(getTheme());

  // Update thread data when parent passes new thread
  useEffect(() => {
    setThreadData(t);
    setCounts({ up: t.up || 0, down: t.down || 0 });
  }, [t]);

  useEffect(() => {
    const checkTheme = () => {
      setTheme(getTheme());
    };
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const load = async () => {
    const res = await listComments(threadData._id);
    setRows(res.comments ?? []);
  };
  
  const reloadThreadData = async () => {
    // Re-fetch the thread from parent via a callback, or just reload comments which will sync state
    await load();
  };
  
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadData._id]);

  const net = counts.up - counts.down;

  const onVoteThread = async (upvote: boolean) => {
    const updated = await vote("thread", threadData._id, upvote);
    // narrow: thread updates will include up/down
    if (updated && typeof updated === "object" && "up" in updated && "down" in updated) {
      const newCounts = { up: (updated as Thread).up || 0, down: (updated as Thread).down || 0 };
      setCounts(newCounts);
      setThreadData(prev => ({ ...prev, ...(updated as Thread) }));
    }
    // Reload comments to keep everything in sync
    if (open) await load();
  };

  const postComment = async (text: string, parentId?: string | null) => {
    // Prefer the API helper. If your helper doesn’t accept parentId yet, do a direct fetch.
    try {
      const helperAcceptsParent =
        (addCommentApi as unknown as (a: string, b: string, c?: string) => Promise<Comment>)
          .length >= 3;

      const c = helperAcceptsParent
        ? await (addCommentApi as unknown as (tid: string, body: string, parentId?: string) => Promise<Comment>)(
            t._id,
            text,
            parentId || undefined
          )
        : await (await fetch("/api/community/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId: t._id, body: text, parentId: parentId || undefined }),
          })).json();

      setRows((prev) => [...prev, c as Comment]);
    } catch {
      // ignore network/shape errors for now
    }
  };

  const onAdd = async () => {
    if (!body.trim()) return;
    await postComment(body.trim(), null);
    setBody("");
  };

  const onReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    await postComment(replyText.trim(), parentId);
    setReplyText("");
    setReplyFor(null);
  };

  // Build a 1-level tree: roots + children map
  const [roots, childrenMap] = useMemo(() => {
    const kids: Record<string, Comment[]> = {};
    const r: Comment[] = [];
    for (const c of rows) {
      if ((c as any).parentId) {
        (kids[(c as any).parentId as string] ||= []).push(c);
      } else {
        r.push(c);
      }
    }
    return [r, kids] as const;
  }, [rows]);

  const CommentRow = ({ c }: { c: Comment }) => {
    const [cu, setCu] = useState({ up: c.up || 0, down: c.down || 0 });
    const netc = cu.up - cu.down;

    const onVote = async (upvote: boolean) => {
      const updated = await vote("comment", c._id, upvote);
      // narrow safely: only update local counts if API returned counts
      if (updated && typeof updated === "object" && "up" in updated && "down" in updated) {
        setCu({
          up: (updated as Comment).up || 0,
          down: (updated as Comment).down || 0,
        });
      }
      // Reload comments to ensure thread vote counts are fresh
      await load();
    };

    return (
        <div className={styles.comment}>
        <Avatar author={c.author as Author} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{c.author?.username || "user"}</span>
          </div>
          <div className={styles.commentBody}>{c.body}</div>
          <div className={styles.commentControls}>
            <button className={styles.commentVoteButton} onClick={() => onVote(true)}>▲ {cu.up}</button>
            <span className={styles.voteCount}>{netc}</span>
            <button className={styles.commentVoteButton} onClick={() => onVote(false)}>▼ {cu.down}</button>
            <button className={styles.replyButton} onClick={() => setReplyFor(c._id)}>
              Reply
            </button>
          </div>

          {replyFor === c._id && (
            <div className={styles.replyForm}>
              <input
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <button onClick={() => onReply(c._id)}>Post</button>
              <button
                onClick={() => {
                  setReplyFor(null);
                  setReplyText("");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* children (1-level) */}
          {(childrenMap[c._id] || []).map((kid) => (
            <div key={kid._id} className={styles.nestedReply}>
              <div className={styles.nestedReplyContent}>
                <Avatar author={kid.author as Author} size={24} />
                <div>
                  <div style={{ fontWeight: 600 }}>{kid.author?.username || "user"}</div>
                  <div className={styles.nestedReplyBody}>{kid.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.threadContainer}>
      {/* header: avatar + username + large bold title */}
      <div className={styles.header}>
        <Avatar author={threadData.author as Author} size={36} />
        <div className={styles.headerInfo}>
          <h2>{threadData.author?.username || "user"}</h2>
          <div className={styles.title}>{threadData.title}</div>
        </div>
      </div>

      {threadData.body && <div className={styles.body}>{threadData.body}</div>}

      <div className={styles.controls}>
        <button className={styles.voteButton} onClick={() => onVoteThread(true)}>▲ {counts.up}</button>
        <span className={styles.voteCount}>{net}</span>
        <button className={styles.voteButton} onClick={() => onVoteThread(false)}>▼ {counts.down}</button>
        <span className={styles.meta}>
          stance: <strong>{threadData.stance}</strong> · RS: <strong>{Number(threadData.reliabilityScore || 0).toFixed(2)}</strong>
        </span>
        <button className={styles.commentsButton} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide Comments" : "View Comments"}
        </button>
      </div>

      {open && (
        <div className={styles.commentsSection}>
          {/* new top-level comment */}
          <div className={styles.newCommentForm}>
            <input
              placeholder="Write a comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button onClick={onAdd} disabled={!body.trim()}>
              Post
            </button>
          </div>

          <div className={styles.commentsList}>
            {roots.map((c) => (
              <CommentRow key={c._id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
