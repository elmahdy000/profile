interface CodeWindowProps {
  variant?: "editor" | "terminal";
  className?: string;
}

// Traffic-light dots kept tasteful/on-brand (muted slate, no red/yellow/green).
function WindowDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-full bg-border" />
      <span className="h-3 w-3 rounded-full bg-border" />
      <span className="h-3 w-3 rounded-full bg-border" />
    </div>
  );
}

export function CodeWindow({ variant = "editor", className = "" }: CodeWindowProps) {
  return (
    <div
      aria-hidden="true"
      className={`max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg ${className}`}
    >
      {/* Header / chrome bar */}
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
        <WindowDots />
        <div className="font-mono text-xs text-muted-foreground">
          {variant === "editor" ? "main.py" : "~ zsh"}
        </div>
      </div>

      {/* Body — dark navy code surface */}
      <div className="bg-accent px-4 py-4">
        {variant === "editor" ? <EditorBody /> : <TerminalBody />}
      </div>
    </div>
  );
}

function EditorBody() {
  const lines = [
    <>
      <span className="text-primary">def</span>{" "}
      <span className="text-[#06B6D4]">solve</span>
      <span className="text-slate-300">(problem):</span>
    </>,
    <>
      <span className="text-slate-300">    steps = </span>
      <span className="text-[#06B6D4]">analyze</span>
      <span className="text-slate-300">(problem)</span>
    </>,
    <>
      <span className="text-primary">    for</span>
      <span className="text-slate-300"> step </span>
      <span className="text-primary">in</span>
      <span className="text-slate-300"> steps:</span>
    </>,
    <>
      <span className="text-slate-300">        </span>
      <span className="text-[#06B6D4]">run</span>
      <span className="text-slate-300">(step)</span>
    </>,
    <>
      <span className="text-primary">    return</span>{" "}
      <span className="text-[#06B6D4]">"الحل جاهز"</span>
    </>,
    <span className="text-slate-500">&nbsp;</span>,
    <>
      <span className="text-[#06B6D4]">print</span>
      <span className="text-slate-300">(</span>
      <span className="text-[#06B6D4]">solve</span>
      <span className="text-slate-300">(</span>
      <span className="text-[#06B6D4]">"مسألة برمجية"</span>
      <span className="text-slate-300">))</span>
    </>,
  ];

  return (
    <div dir="ltr" className="flex font-mono text-xs leading-6 sm:text-sm">
      {/* Line-number gutter */}
      <div className="select-none pr-4 text-right text-muted-foreground">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* Code */}
      <div className="min-w-0 whitespace-pre">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function TerminalBody() {
  return (
    <div dir="ltr" className="font-mono text-xs leading-6 sm:text-sm">
      <div>
        <span className="text-[#06B6D4]">$</span>{" "}
        <span className="text-slate-300">python main.py</span>
      </div>
      <div className="text-slate-400">الحل جاهز</div>
      <div className="flex items-center">
        <span className="text-[#06B6D4]">$</span>
        <span
          className="ml-2 inline-block h-4 w-2 animate-pulse bg-primary motion-reduce:animate-none"
        />
      </div>
    </div>
  );
}
