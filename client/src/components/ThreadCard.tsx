// client/src/components/ThreadCard.tsx
import { useEffect, useMemo, useState } from "react";
import {
  addComment as addCommentApi,
  listComments,
  vote,
  Comment,
  Thread,
} from "../api/community";

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
  const [counts, setCounts] = useState({ up: t.up || 0, down: t.down || 0 });

  const load = async () => {
    const res = await listComments(t._id);
    setRows(res.comments ?? []);
  };
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const net = counts.up - counts.down;

  const onVoteThread = async (upvote: boolean) => {
    const updated = await vote("thread", t._id, upvote);
    // narrow: thread updates will include up/down
    if (updated && typeof updated === "object" && "up" in updated && "down" in updated) {
      setCounts({ up: (updated as Thread).up || 0, down: (updated as Thread).down || 0 });
    }
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
    };

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr",
          gap: 8,
          padding: "8px 0",
          borderTop: "1px solid #eee",
        }}
      >
        <Avatar author={c.author as Author} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>{c.author?.username || "user"}</span>
          </div>
          <div style={{ marginTop: 4 }}>{c.body}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <button onClick={() => onVote(true)}>▲ {cu.up}</button>
            <span style={{ minWidth: 20, textAlign: "center" }}>{netc}</span>
            <button onClick={() => onVote(false)}>▼ {cu.down}</button>
            <button style={{ marginLeft: "auto" }} onClick={() => setReplyFor(c._id)}>
              Reply
            </button>
          </div>

          {replyFor === c._id && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                placeholder="Write a reply…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={{ flex: 1 }}
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
            <div key={kid._id} style={{ marginTop: 8, marginLeft: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 8 }}>
                <Avatar author={kid.author as Author} size={24} />
                <div>
                  <div style={{ fontWeight: 600 }}>{kid.author?.username || "user"}</div>
                  <div style={{ marginTop: 2 }}>{kid.body}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
      {/* header: avatar + username + large bold title */}
      <div style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 10, alignItems: "center" }}>
        <Avatar author={t.author as Author} size={36} />
        <div>
          <div style={{ fontWeight: 700 }}>{t.author?.username || "user"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>{t.title}</div>
        </div>
      </div>

      {t.body && <div style={{ marginTop: 10, color: "#222" }}>{t.body}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <button onClick={() => onVoteThread(true)}>▲ {counts.up}</button>
        <span style={{ minWidth: 24, textAlign: "center" }}>{net}</span>
        <button onClick={() => onVoteThread(false)}>▼ {counts.down}</button>
        <span style={{ marginLeft: 8, color: "#666" }}>
          stance: {t.stance} · RS: {Number(t.reliabilityScore || 0).toFixed(2)}
        </span>
        <button onClick={() => setOpen((v) => !v)} style={{ marginLeft: "auto" }}>
          {open ? "Hide" : "Comments"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {/* new top-level comment */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Write a comment..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ flex: 1 }}
            />
            <button onClick={onAdd} disabled={!body.trim()}>
              Post
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            {roots.map((c) => (
              <CommentRow key={c._id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
