import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  PlayCircle,
  Loader2,
  Terminal,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  RotateCcw,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Keyboard,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// ─── API helper ────────────────────────────────────────────────────────────────
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

// ─── C++ Templates ─────────────────────────────────────────────────────────────
const CPP_TEMPLATES: Record<string, { label: string; icon: string; code: string; stdin?: string; description: string }> = {
  hello: {
    label: "Hello World",
    icon: "👋",
    description: "أول برنامج — طباعة نص على الشاشة",
    code: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "Welcome to C++ Compiler 🚀" << endl;
    return 0;
}`,
  },
  input: {
    label: "User Input",
    icon: "📥",
    description: "قراءة بيانات من المستخدم باستخدام cin",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    int age;

    cout << "Enter your name: ";
    cin >> name;
    cout << "Enter your age: ";
    cin >> age;

    cout << "Hello, " << name << "!" << endl;
    cout << "You are " << age << " years old." << endl;
    return 0;
}`,
    stdin: "Mahmoud\n22",
  },
  conditions: {
    label: "If / Else",
    icon: "🔀",
    description: "الشروط والتفرعات المنطقية",
    code: `#include <iostream>
using namespace std;

int main() {
    int score;
    cout << "Enter your score: ";
    cin >> score;

    if (score >= 90) {
        cout << "Grade: A - Excellent!" << endl;
    } else if (score >= 80) {
        cout << "Grade: B - Very Good" << endl;
    } else if (score >= 70) {
        cout << "Grade: C - Good" << endl;
    } else if (score >= 60) {
        cout << "Grade: D - Pass" << endl;
    } else {
        cout << "Grade: F - Fail" << endl;
    }
    return 0;
}`,
    stdin: "85",
  },
  loops: {
    label: "Loops",
    icon: "🔄",
    description: "حلقات التكرار for و while",
    code: `#include <iostream>
using namespace std;

int main() {
    // For loop
    cout << "=== For Loop ===" << endl;
    for (int i = 1; i <= 5; i++) {
        cout << "Iteration #" << i << endl;
    }

    // While loop
    cout << "\\n=== While Loop ===" << endl;
    int count = 5;
    while (count > 0) {
        cout << "Countdown: " << count << endl;
        count--;
    }
    cout << "Liftoff! 🚀" << endl;

    return 0;
}`,
  },
  arrays: {
    label: "Arrays",
    icon: "📊",
    description: "المصفوفات والعمليات الحسابية عليها",
    code: `#include <iostream>
using namespace std;

int main() {
    int numbers[] = {10, 25, 30, 45, 50};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    int sum = 0;
    int maxVal = numbers[0];
    int minVal = numbers[0];

    for (int i = 0; i < size; i++) {
        sum += numbers[i];
        if (numbers[i] > maxVal) maxVal = numbers[i];
        if (numbers[i] < minVal) minVal = numbers[i];
    }

    cout << "Array: ";
    for (int i = 0; i < size; i++) {
        cout << numbers[i];
        if (i < size - 1) cout << ", ";
    }
    cout << endl;
    cout << "Sum:     " << sum << endl;
    cout << "Average: " << (double)sum / size << endl;
    cout << "Max:     " << maxVal << endl;
    cout << "Min:     " << minVal << endl;

    return 0;
}`,
  },
  functions: {
    label: "Functions",
    icon: "⚡",
    description: "تعريف واستدعاء الدوال",
    code: `#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int num;
    cout << "Enter a number: ";
    cin >> num;

    cout << num << "! = " << factorial(num) << endl;
    cout << num << " is " << (isPrime(num) ? "Prime" : "Not Prime") << endl;

    return 0;
}`,
    stdin: "7",
  },
  strings: {
    label: "Strings",
    icon: "📝",
    description: "التعامل مع النصوص والسلاسل",
    code: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string text;
    cout << "Enter a sentence: ";
    getline(cin, text);

    // Length
    cout << "Length: " << text.length() << endl;

    // Uppercase
    string upper = text;
    transform(upper.begin(), upper.end(), upper.begin(), ::toupper);
    cout << "Upper: " << upper << endl;

    // Reverse
    string reversed = text;
    reverse(reversed.begin(), reversed.end());
    cout << "Reversed: " << reversed << endl;

    // Word count
    int words = 1;
    for (char c : text) {
        if (c == ' ') words++;
    }
    cout << "Words: " << words << endl;

    // Palindrome check
    string cleaned = text;
    cleaned.erase(remove(cleaned.begin(), cleaned.end(), ' '), cleaned.end());
    transform(cleaned.begin(), cleaned.end(), cleaned.begin(), ::tolower);
    string rev = cleaned;
    reverse(rev.begin(), rev.end());
    cout << "Palindrome: " << (cleaned == rev ? "Yes" : "No") << endl;

    return 0;
}`,
    stdin: "Hello World",
  },
  pointers: {
    label: "Pointers",
    icon: "🎯",
    description: "المؤشرات وعناوين الذاكرة",
    code: `#include <iostream>
using namespace std;

void swapValues(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 10, y = 20;

    cout << "Before swap:" << endl;
    cout << "x = " << x << ", y = " << y << endl;

    // Pointer basics
    int* ptr = &x;
    cout << "\\nPointer to x:" << endl;
    cout << "Address: " << ptr << endl;
    cout << "Value:   " << *ptr << endl;

    // Swap using pointers
    swapValues(&x, &y);
    cout << "\\nAfter swap:" << endl;
    cout << "x = " << x << ", y = " << y << endl;

    // Dynamic memory
    int* arr = new int[5];
    for (int i = 0; i < 5; i++) arr[i] = (i + 1) * 10;

    cout << "\\nDynamic array: ";
    for (int i = 0; i < 5; i++) cout << arr[i] << " ";
    cout << endl;

    delete[] arr;
    return 0;
}`,
  },
  oop: {
    label: "OOP / Classes",
    icon: "🏗️",
    description: "البرمجة الكائنية — كلاسات وكائنات",
    code: `#include <iostream>
#include <string>
using namespace std;

class Student {
private:
    string name;
    int age;
    double gpa;

public:
    Student(string n, int a, double g) : name(n), age(a), gpa(g) {}

    void display() const {
        cout << "Name: " << name << endl;
        cout << "Age:  " << age << endl;
        cout << "GPA:  " << gpa << endl;
        cout << "Grade: " << getGrade() << endl;
    }

    string getGrade() const {
        if (gpa >= 3.7) return "A - Excellent";
        if (gpa >= 3.0) return "B - Very Good";
        if (gpa >= 2.0) return "C - Good";
        return "D - Needs Improvement";
    }

    bool operator>(const Student& other) const {
        return gpa > other.gpa;
    }
};

int main() {
    Student s1("Ahmed", 20, 3.8);
    Student s2("Sara", 19, 3.5);

    cout << "=== Student 1 ===" << endl;
    s1.display();

    cout << "\\n=== Student 2 ===" << endl;
    s2.display();

    cout << "\\nHigher GPA: " << (s1 > s2 ? "Student 1" : "Student 2") << endl;

    return 0;
}`,
  },
  switchcase: {
    label: "Switch",
    icon: "🔃",
    description: "جملة التبديل switch-case",
    code: `#include <iostream>
using namespace std;

int main() {
    int choice;
    double a, b;

    cout << "=== Simple Calculator ===" << endl;
    cout << "1. Add" << endl;
    cout << "2. Subtract" << endl;
    cout << "3. Multiply" << endl;
    cout << "4. Divide" << endl;
    cout << "Choice: ";
    cin >> choice;

    cout << "Enter two numbers: ";
    cin >> a >> b;

    switch (choice) {
        case 1:
            cout << a << " + " << b << " = " << a + b << endl;
            break;
        case 2:
            cout << a << " - " << b << " = " << a - b << endl;
            break;
        case 3:
            cout << a << " * " << b << " = " << a * b << endl;
            break;
        case 4:
            if (b != 0)
                cout << a << " / " << b << " = " << a / b << endl;
            else
                cout << "Error: Division by zero!" << endl;
            break;
        default:
            cout << "Invalid choice!" << endl;
    }
    return 0;
}`,
    stdin: "1\n10 5",
  },
};

// ─── Syntax Highlighting ────────────────────────────────────────────────────────
const CPP_KEYWORDS = new Set([
  "include", "using", "namespace", "if", "else", "for", "while", "do",
  "return", "struct", "class", "public", "private", "protected", "virtual",
  "override", "const", "static", "inline", "extern", "typedef", "enum",
  "switch", "case", "break", "continue", "default", "try", "catch", "throw",
  "new", "delete", "template", "typename", "auto", "register", "volatile",
  "friend", "operator", "this", "sizeof", "goto", "define", "ifdef",
  "ifndef", "endif", "pragma", "elif",
]);
const CPP_TYPES = new Set([
  "int", "float", "double", "char", "string", "bool", "void", "long",
  "short", "unsigned", "signed", "size_t", "wchar_t", "nullptr_t",
  "int8_t", "int16_t", "int32_t", "int64_t", "uint8_t", "uint16_t",
  "uint32_t", "uint64_t",
]);
const CPP_BUILTINS = new Set([
  "cout", "cin", "endl", "cerr", "clog", "printf", "scanf", "getline",
  "push_back", "pop_back", "begin", "end", "size", "length", "empty",
  "sort", "reverse", "find", "substr", "append", "insert", "erase",
  "transform", "remove", "swap", "max", "min", "abs", "pow", "sqrt",
  "floor", "ceil", "round", "rand", "srand", "time", "malloc", "free",
  "memset", "memcpy", "strcmp", "strlen", "strcpy", "stoi", "to_string",
]);
const CPP_CONSTANTS = new Set([
  "true", "false", "NULL", "nullptr", "EOF", "INT_MAX", "INT_MIN",
  "LONG_MAX", "LONG_MIN", "DBL_MAX", "DBL_MIN", "PI",
  "npos", "string::npos",
]);

const TOKEN_REGEX = /(\/\/.*|\/\*[\s\S]*?\*\/|#\s*\w+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|<[a-zA-Z_][a-zA-Z0-9_./]*>|\b[a-zA-Z_]\w*\b|\b\d+\.?\d*[fFlLuU]?\b|[{}()[\];,]|<<|>>|->|::|[+\-*/%=!<>&|^~?:]+)/g;

function highlightLine(line: string, hasInclude: boolean): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN_REGEX.source, "g");

  while ((match = re.exec(line)) !== null) {
    // Plain text before this token
    if (match.index > lastIndex) {
      parts.push(<span key={`t${lastIndex}`} className="text-slate-300">{line.slice(lastIndex, match.index)}</span>);
    }
    const token = match[0];
    const key = `m${match.index}`;

    if (token.startsWith("//") || token.startsWith("/*")) {
      parts.push(<span key={key} className="text-slate-500 italic">{token}</span>);
    } else if (token.startsWith("#")) {
      parts.push(<span key={key} className="text-pink-400 font-bold">{token}</span>);
    } else if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      parts.push(<span key={key} className="text-emerald-400">{token}</span>);
    } else if (token.startsWith("<") && token.endsWith(">") && hasInclude) {
      parts.push(<span key={key} className="text-amber-300">{token}</span>);
    } else if (CPP_KEYWORDS.has(token)) {
      parts.push(<span key={key} className="text-pink-500 font-bold">{token}</span>);
    } else if (CPP_TYPES.has(token)) {
      parts.push(<span key={key} className="text-sky-400 font-semibold">{token}</span>);
    } else if (CPP_CONSTANTS.has(token)) {
      parts.push(<span key={key} className="text-orange-400 font-semibold">{token}</span>);
    } else if (CPP_BUILTINS.has(token)) {
      parts.push(<span key={key} className="text-violet-400 font-semibold">{token}</span>);
    } else if (/^\d/.test(token)) {
      parts.push(<span key={key} className="text-amber-400">{token}</span>);
    } else if (/^[{}()[\]]$/.test(token)) {
      parts.push(<span key={key} className="text-yellow-300">{token}</span>);
    } else if (token === "<<" || token === ">>" || token === "->" || token === "::") {
      parts.push(<span key={key} className="text-cyan-400">{token}</span>);
    } else if (/^[+\-*/%=!<>&|^~?:;,]+$/.test(token)) {
      parts.push(<span key={key} className="text-cyan-300">{token}</span>);
    } else {
      parts.push(<span key={key} className="text-slate-200">{token}</span>);
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(<span key={`e${lastIndex}`} className="text-slate-300">{line.slice(lastIndex)}</span>);
  }
  if (parts.length === 0) parts.push(<span key="empty">{"​"}</span>);
  return parts;
}

// ─── Parse Error Lines ──────────────────────────────────────────────────────────
function parseErrorLines(errorText: string): Set<number> {
  const lines = new Set<number>();
  const re = /(?:main\.cpp|<stdin>):(\d+):/g;
  let m;
  while ((m = re.exec(errorText)) !== null) {
    lines.add(Number(m[1]));
  }
  return lines;
}

// ─── Font Sizes ─────────────────────────────────────────────────────────────────
const FONT_SIZES = [
  { key: "xs", label: "صغير", size: "text-[11px]", lineH: "leading-[1.65]" },
  { key: "sm", label: "وسط", size: "text-xs sm:text-sm", lineH: "leading-relaxed" },
  { key: "md", label: "كبير", size: "text-sm sm:text-base", lineH: "leading-relaxed" },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────────
export function CppCompilerPanel() {
  const [code, setCode] = useState(CPP_TEMPLATES.hello.code);
  const [stdinText, setStdinText] = useState("");
  const [outputContent, setOutputContent] = useState("");
  const [errorOutput, setErrorOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("hello");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStdin, setShowStdin] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSizeIdx, setFontSizeIdx] = useState(1);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [splitRatio, setSplitRatio] = useState(55); // percentage for editor

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const lines = code.split("\n");
  const lineCount = lines.length;
  const hasCin = code.includes("cin") || code.includes("scanf") || code.includes("getline");
  const fontSize = FONT_SIZES[fontSizeIdx];
  const errorLines = parseErrorLines(errorOutput);

  // ─── Scroll Sync ──────────────────────────────────────────────────────────
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  }, []);

  // ─── Cursor Position ──────────────────────────────────────────────────────
  const updateCursor = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const textBefore = code.substring(0, pos);
    const lineNum = textBefore.split("\n").length;
    const lastNewline = textBefore.lastIndexOf("\n");
    const colNum = pos - lastNewline;
    setCursorLine(lineNum);
    setCursorCol(colNum);
  }, [code]);

  // ─── Run Code ─────────────────────────────────────────────────────────────
  const runCode = useCallback(async () => {
    setRunning(true);
    setErrorOutput("");
    setOutputContent("");
    setHasStarted(true);
    setExecutionTime(null);
    setExitCode(null);
    const start = performance.now();

    try {
      const res = await api<{
        output: string;
        error: string;
        exitCode: number;
        success: boolean;
      }>("/api/learning/compiler/run", {
        method: "POST",
        body: JSON.stringify({ code, stdin: stdinText }),
      });
      setExecutionTime(Math.round(performance.now() - start));
      setExitCode(res.exitCode);
      setOutputContent(res.output || "");
      if (res.error) setErrorOutput(res.error);
    } catch (err) {
      setExecutionTime(Math.round(performance.now() - start));
      setErrorOutput((err as Error).message || "Execution error.");
    } finally {
      setRunning(false);
      setTimeout(() => consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [code, stdinText]);

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      // Ctrl+Enter → Run
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runCode();
        return;
      }

      // Tab → 4 spaces
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const newCode = code.substring(0, start) + "    " + code.substring(end);
        setCode(newCode);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
          }
        });
        return;
      }

      // Enter → auto-indent
      if (e.key === "Enter") {
        e.preventDefault();
        const lineBefore = code.substring(0, start).split("\n").pop() || "";
        const indent = lineBefore.match(/^(\s*)/)?.[1] || "";
        const charBefore = code[start - 1];
        const charAfter = code[start];
        const extraIndent = charBefore === "{" ? "    " : "";
        const closingNewline = charBefore === "{" && charAfter === "}" ? "\n" + indent : "";
        const insertion = "\n" + indent + extraIndent + closingNewline;
        const newCode = code.substring(0, start) + insertion + code.substring(end);
        const cursorPos = start + 1 + indent.length + extraIndent.length;
        setCode(newCode);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPos;
          }
        });
        return;
      }

      // Auto-close brackets
      const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
      if (pairs[e.key] && start === end) {
        e.preventDefault();
        const insertion = e.key + pairs[e.key];
        const newCode = code.substring(0, start) + insertion + code.substring(end);
        setCode(newCode);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          }
        });
        return;
      }

      // Backspace — delete matching pair
      if (e.key === "Backspace" && start === end && start > 0) {
        const before = code[start - 1];
        const after = code[start];
        if (pairs[before] && pairs[before] === after) {
          e.preventDefault();
          const newCode = code.substring(0, start - 1) + code.substring(start + 1);
          setCode(newCode);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start - 1;
            }
          });
        }
      }
    },
    [code, runCode],
  );

  // ─── Template Change ──────────────────────────────────────────────────────
  const handleTemplateChange = useCallback((key: string) => {
    const tmpl = CPP_TEMPLATES[key];
    if (!tmpl) return;
    setSelectedTemplate(key);
    setCode(tmpl.code);
    setStdinText(tmpl.stdin || "");
    setOutputContent("");
    setErrorOutput("");
    setHasStarted(false);
    setExecutionTime(null);
    setExitCode(null);
    setShowTemplates(false);
    if (tmpl.stdin) setShowStdin(true);
  }, []);

  // ─── Copy / Download ──────────────────────────────────────────────────────
  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    toast({ title: "✅ Copied!", description: "Code copied to clipboard" });
  }, [code]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([code], { type: "text/x-c++src" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "main.cpp";
    a.click();
    URL.revokeObjectURL(url);
  }, [code]);

  // ─── Resizable Split ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !editorWrapRef.current) return;
      const rect = editorWrapRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(30, pct)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // ─── Auto show STDIN when cin detected ────────────────────────────────────
  useEffect(() => {
    if (hasCin && !showStdin) setShowStdin(true);
  }, [hasCin]);

  // ─── Fullscreen Escape ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isFullscreen]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const containerClass = isFullscreen
    ? "fixed inset-0 z-[200] flex flex-col bg-[#0d1117]"
    : "rounded-2xl border border-slate-700/60 bg-[#0d1117] shadow-2xl overflow-hidden";

  return (
    <div className={containerClass} dir="ltr">
      {/* ━━━ Top Toolbar ━━━ */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#161b22] border-b border-slate-700/60 flex-shrink-0">
        {/* Left: File tab + template picker */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-slate-700/60 rounded-lg text-xs font-mono font-bold text-slate-200 shadow-sm shrink-0">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            main.cpp
          </div>

          {/* Template Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-lg transition-all"
            >
              <span>{CPP_TEMPLATES[selectedTemplate]?.icon}</span>
              <span className="hidden sm:inline">{CPP_TEMPLATES[selectedTemplate]?.label}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showTemplates && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
                <div className="absolute top-full left-0 mt-1.5 z-50 w-[280px] max-h-[360px] overflow-y-auto rounded-xl border border-slate-700/60 bg-[#161b22] shadow-2xl py-1.5">
                  {Object.entries(CPP_TEMPLATES).map(([key, tmpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateChange(key)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-800/80 ${selectedTemplate === key ? "bg-blue-500/15 border-r-2 border-blue-500" : ""}`}
                    >
                      <span className="text-base shrink-0">{tmpl.icon}</span>
                      <div className="min-w-0">
                        <strong className={`block text-xs font-bold ${selectedTemplate === key ? "text-blue-400" : "text-slate-200"}`}>{tmpl.label}</strong>
                        <span className="block text-[10px] text-slate-500 truncate">{tmpl.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Font size */}
          <button
            type="button"
            onClick={() => setFontSizeIdx((i) => (i + 1) % FONT_SIZES.length)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title={`حجم الخط: ${fontSize.label}`}
          >
            <Type className="h-3.5 w-3.5" />
          </button>

          {/* Copy */}
          <button
            type="button"
            onClick={copyCode}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Copy Code"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {/* Download */}
          <button
            type="button"
            onClick={downloadCode}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Download .cpp"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <div className="w-px h-6 bg-slate-700/60 mx-1" />

          {/* STDIN toggle */}
          <button
            type="button"
            onClick={() => setShowStdin((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all border ${showStdin ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "text-slate-400 border-slate-700/40 hover:text-white hover:bg-slate-700/60"}`}
          >
            <Keyboard className="h-3 w-3" />
            <span className="hidden sm:inline">STDIN</span>
          </button>

          {/* Run */}
          <Button
            onClick={() => void runCode()}
            disabled={running}
            className="h-8 px-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-lg shadow-lg shadow-blue-900/30 transition-all active:scale-95 flex items-center gap-1.5 border-0"
          >
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Compiling...</span>
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 fill-white" />
                <span>Run</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ━━━ Main Split View ━━━ */}
      <div
        ref={editorWrapRef}
        className={`flex-1 flex flex-col lg:flex-row min-h-0 ${isFullscreen ? "" : "min-h-[520px]"}`}
      >
        {/* ─── Editor Panel ─── */}
        <div
          className="flex flex-col bg-[#0d1117] min-h-[300px] lg:min-h-0 overflow-hidden"
          style={{ flex: `0 0 ${splitRatio}%` }}
        >
          {/* Code Editor */}
          <div className={`flex-1 flex relative overflow-hidden ${fontSize.size} font-mono ${fontSize.lineH}`}>
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="py-3 pl-2 pr-2 select-none text-right text-slate-600 bg-[#0d1117] border-r border-slate-800/60 min-w-[48px] text-[11px] font-mono overflow-hidden"
            >
              {Array.from({ length: lineCount }, (_, i) => {
                const n = i + 1;
                const isError = errorLines.has(n);
                const isCurrent = n === cursorLine;
                return (
                  <div
                    key={n}
                    className={`${fontSize.lineH} px-1 ${
                      isError
                        ? "text-red-500 font-bold bg-red-500/10"
                        : isCurrent
                        ? "text-slate-300 font-bold"
                        : ""
                    }`}
                  >
                    {n}
                  </div>
                );
              })}
            </div>

            {/* Code Area */}
            <div className="relative flex-1 overflow-hidden">
              {/* Highlighted Backdrop */}
              <div
                ref={highlightRef}
                aria-hidden="true"
                className={`absolute inset-0 py-3 px-4 pointer-events-none whitespace-pre font-mono ${fontSize.size} ${fontSize.lineH} overflow-hidden text-slate-200 select-none`}
              >
                {lines.map((line, i) => {
                  const n = i + 1;
                  const isError = errorLines.has(n);
                  const isCurrent = n === cursorLine && !errorLines.size;
                  return (
                    <div
                      key={i}
                      className={`${fontSize.lineH} ${
                        isError
                          ? "bg-red-500/8 border-l-2 border-red-500 -ml-1 pl-1"
                          : isCurrent
                          ? "bg-slate-800/50"
                          : ""
                      }`}
                    >
                      {highlightLine(line, line.includes("#include"))}
                    </div>
                  );
                })}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                onClick={updateCursor}
                onKeyUp={updateCursor}
                spellCheck={false}
                className={`absolute inset-0 w-full h-full py-3 px-4 font-mono ${fontSize.size} ${fontSize.lineH} text-transparent caret-sky-400 bg-transparent focus:outline-none resize-none selection:bg-blue-600/30`}
                placeholder="// Write C++ code here..."
              />
            </div>
          </div>

          {/* STDIN Input Panel */}
          {showStdin && (
            <div className="border-t border-slate-700/80 bg-[#161b22] p-3 flex-shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">Input (STDIN for cin):</span>
                  {hasCin && <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">cin detected</span>}
                </div>
                <button type="button" onClick={() => setShowStdin(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={stdinText}
                onChange={(e) => setStdinText(e.target.value)}
                placeholder="Write input for cin here (e.g. Mahmoud 22)..."
                rows={2}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-700 bg-[#0d1117] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none shadow-inner"
              />
            </div>
          )}

          {/* Status Bar */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-t border-slate-800/60 text-[10px] font-mono text-slate-500 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span>Ln {cursorLine}, Col {cursorCol}</span>
              <span>{lineCount} lines</span>
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-600">C++17</span>
              <span className="text-blue-400/60 font-bold">⌘↵ Run</span>
            </div>
          </div>
        </div>

        {/* ─── Drag Handle ─── */}
        <div
          className="hidden lg:flex w-[5px] cursor-col-resize items-center justify-center bg-slate-800/80 hover:bg-blue-500/30 active:bg-blue-500/40 transition-colors flex-shrink-0 group"
          onMouseDown={() => {
            isDragging.current = true;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        >
          <div className="w-[3px] h-8 rounded-full bg-slate-600 group-hover:bg-blue-400 group-active:bg-blue-400 transition-colors" />
        </div>

        {/* ─── Output Panel ─── */}
        <div className="flex-1 flex flex-col bg-[#090d16] text-slate-100 border-t lg:border-t-0 border-slate-700/60 min-h-[200px] lg:min-h-0 overflow-hidden">
          {/* Output Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0d1117] border-b border-slate-700/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-slate-300">Output</span>
              {hasStarted && !running && (
                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  errorOutput && !outputContent
                    ? "bg-red-500/15 text-red-400"
                    : exitCode === 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}>
                  {errorOutput && !outputContent ? (
                    <><AlertTriangle className="h-2.5 w-2.5" /> Compilation Error</>
                  ) : exitCode === 0 ? (
                    <><CheckCircle2 className="h-2.5 w-2.5" /> Success</>
                  ) : (
                    <><AlertTriangle className="h-2.5 w-2.5" /> Exit Code: {exitCode}</>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {executionTime !== null && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                  <Clock className="h-2.5 w-2.5" />
                  {executionTime}ms
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setOutputContent("");
                  setErrorOutput("");
                  setHasStarted(false);
                  setExecutionTime(null);
                  setExitCode(null);
                }}
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 hover:text-white px-2 py-1 rounded-md border border-slate-700/50 bg-slate-800/40 hover:bg-slate-700/60 transition-colors"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Clear
              </button>
            </div>
          </div>

          {/* Console Output */}
          <div className="flex-1 p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-y-auto bg-[#090d16] text-slate-100">
            {!hasStarted && !running ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-10">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800/60 text-slate-600">
                  <Terminal className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Ready to compile</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Click <strong className="text-emerald-500">Run</strong> or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">Enter</kbd>
                  </p>
                </div>
              </div>
            ) : running ? (
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span className="text-sm font-semibold">Compiling and running...</span>
              </div>
            ) : (
              <div className="font-mono whitespace-pre-wrap leading-relaxed">
                {outputContent && (
                  <div className="text-slate-100">{outputContent}</div>
                )}
                {errorOutput && (
                  <div className="mt-2 text-red-400 whitespace-pre-wrap font-mono text-xs bg-red-950/30 p-3.5 rounded-xl border border-red-900/40 leading-relaxed">
                    {errorOutput}
                  </div>
                )}
                {!errorOutput && outputContent && exitCode === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-500/80 font-sans font-bold border-t border-slate-800/60 pt-3">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Program exited successfully
                    {executionTime !== null && <span className="text-slate-600 font-normal">• {executionTime}ms</span>}
                  </div>
                )}
              </div>
            )}
            <div ref={consoleBottomRef} />
          </div>
        </div>
      </div>

      {/* Fullscreen close hint */}
      {isFullscreen && (
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white text-[11px] font-bold border border-slate-700/40 backdrop-blur-sm transition-colors"
          >
            <Minimize2 className="h-3 w-3" />
            ESC to exit
          </button>
        </div>
      )}
    </div>
  );
}
