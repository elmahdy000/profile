import React from "react";
import { cn } from "@/lib/utils";

interface BidiStatementProps {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
}

const CODE_TOKEN_REGEX =
  /(`[^`]+`|<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>|\b(?:O|Θ|Ω)\s*\([^)]+\)|\bC\+\+|\bC#|\b\.NET|\bF#|\bHTML5|\bCSS3|\([A-Za-z0-9_\s&+/.:,-]+\)|[A-Za-z0-9][A-Za-z0-9_&+/.:,-]*(?:\s+[A-Za-z0-9][A-Za-z0-9_&+/.:,-]+)*|\b(?:const\s+)?(?:int|float|double|char|bool|string|void|auto|long|short|unsigned)\s+[a-zA-Z0-9_\s*+=%&|<>!/().-]+;?|\b(?:cout|cin)\s*(?:<<|>>)\s*[^;]+;?|\b(?:printf|scanf|return|sizeof)\s*[^;]+;?|\b(?:if|for|while|switch)\s*\([^)]+\)|\b[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]+;|\b[a-zA-Z_][a-zA-Z0-9_]*(?:\+\+|--);?)/g;

export function BidiStatement({
  text,
  className,
  as: Component = "span",
}: BidiStatementProps) {
  if (!text) return null;

  const hasArabic = /[\u0600-\u06FF]/.test(text);

  if (!hasArabic) {
    if (text.startsWith("`") && text.endsWith("`") && text.length > 2) {
      const cleanCode = text.slice(1, -1);
      return (
        <code
          dir="ltr"
          className={cn(
            "inline-block font-mono font-bold bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[13px] sm:text-sm break-words [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full align-baseline",
            className,
          )}
          style={{ unicodeBidi: "isolate" }}
        >
          {cleanCode}
        </code>
      );
    }

    if (text.includes("`")) {
      const parts = text.split(/(`[^`]+`)/g);
      return (
        <Component
          dir="ltr"
          className={cn("leading-relaxed break-words", className)}
          style={{ unicodeBidi: "isolate" }}
        >
          {parts.map((part, pIdx) => {
            if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
              return (
                <code
                  key={pIdx}
                  dir="ltr"
                  className="inline-block font-mono font-bold bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[13px] sm:text-sm break-words [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full align-baseline mx-0.5"
                >
                  {part.slice(1, -1)}
                </code>
              );
            }
            return <React.Fragment key={pIdx}>{part}</React.Fragment>;
          })}
        </Component>
      );
    }

    return (
      <Component
        dir="ltr"
        className={cn("leading-relaxed break-words", className)}
        style={{ unicodeBidi: "isolate" }}
      >
        {text}
      </Component>
    );
  }

  const tokens = text.split(CODE_TOKEN_REGEX);

  return (
    <Component
      className={cn("leading-relaxed break-words", className)}
      style={{ unicodeBidi: "isolate" }}
      dir="auto"
    >
      {tokens.map((token, index) => {
        if (!token) return null;

        if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
          const rawCode = token.slice(1, -1);
          return (
            <code
              key={index}
              dir="ltr"
              className="inline-block font-mono font-bold bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[13px] sm:text-sm break-words [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full mx-1 align-baseline"
              style={{ unicodeBidi: "isolate" }}
            >
              {rawCode}
            </code>
          );
        }

        if (/^(?:O|Θ|Ω)\s*\([^)]+\)$/.test(token)) {
          return (
            <bdi
              key={index}
              dir="ltr"
              className="inline-block font-mono font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-rose-500/20 dark:border-rose-400/30 text-[13px] sm:text-sm mx-1 align-baseline whitespace-nowrap"
              style={{ unicodeBidi: "isolate" }}
            >
              {token.trim()}
            </bdi>
          );
        }

        if (
          token === "C++" ||
          token === "C#" ||
          token === ".NET" ||
          token === "F#" ||
          token === "HTML5" ||
          token === "CSS3"
        ) {
          return (
            <bdi
              key={index}
              dir="ltr"
              className="inline-block font-sans font-bold text-rose-700 dark:text-rose-300 mx-1"
              style={{ unicodeBidi: "isolate" }}
            >
              {token}
            </bdi>
          );
        }

        if (/^<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>$/.test(token)) {
          return (
            <code
              key={index}
              dir="ltr"
              className="inline-block font-mono font-bold bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md border border-blue-200 dark:border-slate-700 text-[13px] sm:text-sm break-words whitespace-nowrap mx-1 align-baseline"
              style={{ unicodeBidi: "isolate" }}
            >
              {token}
            </code>
          );
        }

        if (/^\([A-Za-z0-9_\s&+/.:,-]+\)$/.test(token)) {
          const isShortNoSpace = !token.includes(" ") && token.length <= 10;
          return (
            <bdi
              key={index}
              dir="ltr"
              className={cn("inline mx-1 font-sans", isShortNoSpace ? "whitespace-nowrap" : "break-words")}
              style={{ unicodeBidi: "isolate" }}
            >
              {token}
            </bdi>
          );
        }

        if (/^[A-Za-z0-9][A-Za-z0-9_&+/.:,-]*(?:\s+[A-Za-z0-9][A-Za-z0-9_&+/.:,-]+)*$/.test(token)) {
          return (
            <bdi
              key={index}
              dir="ltr"
              className="inline font-sans mx-1"
              style={{ unicodeBidi: "isolate" }}
            >
              {token}
            </bdi>
          );
        }

        const isMatchedCode =
          /^(?:const\s+)?(?:int|float|double|char|bool|string|void|auto|long|short|unsigned)\s+[a-zA-Z0-9_\s*+=%&|<>!/().-]+;?$/.test(
            token,
          ) ||
          /^(?:cout|cin)\s*(?:<<|>>)\s*[^;]+;?$/.test(token) ||
          /^(?:printf|scanf|return|sizeof)\s*[^;]+;?$/.test(token) ||
          /^(?:if|for|while|switch)\s*\([^)]+\)$/.test(token) ||
          /^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^;]+;$/.test(token) ||
          /^[a-zA-Z_][a-zA-Z0-9_]*(?:\+\+|--);?$/.test(token);

        if (isMatchedCode) {
          return (
            <code
              key={index}
              dir="ltr"
              className="inline-block font-mono font-bold bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[13px] sm:text-sm break-words [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full mx-1 align-baseline"
              style={{ unicodeBidi: "isolate" }}
            >
              {token.trim()}
            </code>
          );
        }

        return (
          <span key={index} style={{ unicodeBidi: "isolate" }}>
            {token}
          </span>
        );
      })}
    </Component>
  );
}

