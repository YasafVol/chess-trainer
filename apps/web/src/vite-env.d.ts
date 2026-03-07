interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*?url" {
  const value: string;
  export default value;
}
