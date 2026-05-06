import type { ContentItem } from "@prisma/client";

import type { HiraganaItemPayload } from "@/lib/content/hiragana-payload";

export type { HiraganaItemPayload };

export function hiraganaPayloadFromRow(row: ContentItem): HiraganaItemPayload {
  return row.payload as HiraganaItemPayload;
}

export function HiraganaGrid({ items }: { items: ContentItem[] }) {
  return (
    <div className="char-grid">
      {items.map((row) => {
        const p = hiraganaPayloadFromRow(row);
        return (
          <div key={row.id} className="char-cell" title={`${p.romaji} · ${p.group} · ${p.type}`}>
            <span className="char-main cjk">{p.char}</span>
            <span className="char-romaji">{p.romaji}</span>
          </div>
        );
      })}
    </div>
  );
}
