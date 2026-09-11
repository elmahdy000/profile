declare module "mammoth" {
  export interface Input {
    path?: string;
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
  }

  export interface Options {
    styleMap?: string | Array<string>;
    includeEmbeddedStyleMap?: boolean;
    includeDefaultStyleMap?: boolean;
    convertImage?: any;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
    externalFileAccess?: boolean;
    transformDocument?: (element: any) => any;
  }

  export interface Message {
    type: "warning" | "error";
    message: string;
    error?: unknown;
  }

  export interface Result {
    value: string;
    messages: Array<Message>;
  }

  export interface Mammoth {
    convertToHtml: (input: Input, options?: Options) => Promise<Result>;
    convertToMarkdown: (input: Input, options?: Options) => Promise<Result>;
    extractRawText: (input: Input) => Promise<Result>;
    embedStyleMap: (input: Input, styleMap: string) => Promise<{
      toArrayBuffer: () => ArrayBuffer;
      toBuffer: () => Buffer;
    }>;
    images: any;
  }

  const mammoth: Mammoth;
  export = mammoth;
}
