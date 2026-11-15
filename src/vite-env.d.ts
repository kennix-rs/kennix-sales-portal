/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `true` stamps meeting and site-visit check-ins with the device GPS instead of simulated points. */
  readonly VITE_USE_DEVICE_GPS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
