import type { TextBlock } from "@/lib/funnel";

export function FunnelText({
  block,
  as: Tag = "p",
  className = "",
}: {
  block: TextBlock;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
}) {
  return (
    <Tag
      className={`f-text f-${block.size} ${className}`}
      style={{ fontWeight: block.bold ? 700 : undefined }}
    >
      {block.text
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </Tag>
  );
}
