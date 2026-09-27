declare module 'lucide-*';
declare module '@vitejs/*';
declare module '@tailwindcss/*';
declare module 'motion/*';
declare module 'react-*';

declare module '*vite' {
  export function defineConfig(config: any): any;
  export function loadEnv(mode: string, envDir: string, prefixes?: string | string[]): Record<string, string>;
  export function createServer(inlineConfig?: any): Promise<any>;
  export type Plugin = any;
}

declare module '*react' {
  export function useState<T = any>(initialState?: T | (() => T)): [T, (val: any) => void];
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useRef<T = any>(initialValue?: T | null): { current: T };
  export function useMemo<T = any>(factory: () => T, deps: ReadonlyArray<any> | undefined): T;
  export function useCallback<T extends (...args: any[]) => any = any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useContext<T = any>(context: any): T;
  export function createContext<T = any>(defaultValue: T): any;
  export const StrictMode: any;
  export const Fragment: any;
  const ReactDefault: any;
  export default ReactDefault;
}

declare module '*express' {
  namespace express {
    type Request = any;
    type Response = any;
    type NextFunction = any;
    type Application = any;
    type Router = any;
    function json(options?: any): any;
    function urlencoded(options?: any): any;
    function static(root: string, options?: any): any;
    function Router(options?: any): any;
  }
  function express(): any;
  export = express;
}

declare module '*nodemailer' {
  namespace nodemailer {
    type Transporter = any;
    type SendMailOptions = any;
    function createTransport(transport?: any, defaults?: any): any;
  }
  const nodemailer: any;
  export = nodemailer;
}

declare module '*';
declare module '*/*';
declare module '*/*/*';

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: any;
  }
}

declare namespace React {
  type ReactNode = any;
  type FC<P = {}> = FunctionComponent<P>;
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): any;
  }
  interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: any;
    target: any;
  }
  interface ChangeEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: any;
    target: any;
  }
  interface MouseEvent<T = Element, E = NativeMouseEvent> {
    preventDefault(): void;
    stopPropagation(): void;
    currentTarget: any;
    target: any;
    clientX: number;
    clientY: number;
  }
  interface KeyboardEvent<T = Element> {
    key: string;
    code: string;
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    preventDefault(): void;
    stopPropagation(): void;
  }
  interface DragEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    dataTransfer: any;
  }
  interface CSSProperties {
    [key: string]: any;
  }
  interface RefObject<T> {
    readonly current: T | null;
  }
  interface MutableRefObject<T> {
    current: T;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
  interface Process {
    env: ProcessEnv;
    cwd(): string;
    exit(code?: number): any;
    kill(pid: number, signal?: string | number): boolean;
    uptime(): number;
    on(event: string, listener: (...args: any[]) => void): any;
    stdout: any;
    stderr: any;
    pid: number;
    platform: string;
    argv: string[];
    nextTick(callback: Function, ...args: any[]): void;
  }
  interface Timeout {
    ref(): any;
    unref(): any;
    hasRef?(): boolean;
    refresh?(): any;
  }
}

interface Buffer extends Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
  write(string: string, encoding?: any): number;
  toJSON(): { type: 'Buffer'; data: number[] };
  equals(otherBuffer: Uint8Array): boolean;
  compare(otherBuffer: Uint8Array, targetStart?: number, targetEnd?: number, sourceStart?: number, sourceEnd?: number): number;
  copy(targetBuffer: Uint8Array, targetStart?: number, sourceStart?: number, sourceEnd?: number): number;
  slice(begin?: number, end?: number): Buffer;
  subarray(begin?: number, end?: number): Buffer;
  writeUInt8(value: number, offset?: number): number;
  writeUInt16LE(value: number, offset?: number): number;
  writeUInt16BE(value: number, offset?: number): number;
  writeUInt32LE(value: number, offset?: number): number;
  writeUInt32BE(value: number, offset?: number): number;
  writeInt8(value: number, offset?: number): number;
  writeInt16LE(value: number, offset?: number): number;
  writeInt16BE(value: number, offset?: number): number;
  writeInt32LE(value: number, offset?: number): number;
  writeInt32BE(value: number, offset?: number): number;
  writeFloatLE(value: number, offset?: number): number;
  writeFloatBE(value: number, offset?: number): number;
  writeDoubleLE(value: number, offset?: number): number;
  writeDoubleBE(value: number, offset?: number): number;
  fill(value: any, offset?: number, end?: number, encoding?: any): this;
  indexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: any): number;
  lastIndexOf(value: string | number | Uint8Array, byteOffset?: number, encoding?: any): number;
  includes(value: string | number | Buffer, byteOffset?: number, encoding?: any): boolean;
  readUInt8(offset?: number): number;
  readUInt16LE(offset?: number): number;
  readUInt16BE(offset?: number): number;
  readUInt32LE(offset?: number): number;
  readUInt32BE(offset?: number): number;
  readInt8(offset?: number): number;
  readInt16LE(offset?: number): number;
  readInt16BE(offset?: number): number;
  readInt32LE(offset?: number): number;
  readInt32BE(offset?: number): number;
  readFloatLE(offset?: number): number;
  readFloatBE(offset?: number): number;
  readDoubleLE(offset?: number): number;
  readDoubleBE(offset?: number): number;
  swap16(): Buffer;
  swap32(): Buffer;
  swap64(): Buffer;
}

interface BufferConstructor {
  from( data: any, encodingOrOffset?: any, length?: number ): Buffer;
  alloc(size: number, fill?: string | Buffer | number, encoding?: string): Buffer;
  allocUnsafe(size: number): Buffer;
  allocUnsafeSlow(size: number): Buffer;
  isBuffer(obj: any): obj is Buffer;
  isEncoding(encoding: string): boolean;
  byteLength(string: string | Buffer | DataView | ArrayBuffer | SharedArrayBuffer, encoding?: string): number;
  concat(list: ReadonlyArray<Uint8Array>, totalLength?: number): Buffer;
  compare(buf1: Uint8Array, buf2: Uint8Array): number;
  new (str: string, encoding?: string): Buffer;
  new (size: number): Buffer;
  new (array: Uint8Array): Buffer;
  new (arrayBuffer: ArrayBuffer | SharedArrayBuffer): Buffer;
  new (array: ReadonlyArray<any>): Buffer;
  new (buffer: Buffer): Buffer;
  (str: string, encoding?: string): Buffer;
  (size: number): Buffer;
  (array: Uint8Array): Buffer;
  (arrayBuffer: ArrayBuffer | SharedArrayBuffer): Buffer;
  (array: ReadonlyArray<any>): Buffer;
  (buffer: Buffer): Buffer;
  readonly prototype: Buffer;
  poolSize: number;
}

declare var process: NodeJS.Process;
declare var Buffer: BufferConstructor;
declare var __dirname: string;
