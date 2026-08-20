/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ISSUER_REGISTRY_ADDRESS: string;
  readonly VITE_CREDENTIAL_STATUS_ADDRESS: string;
  readonly VITE_ISSUER_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
