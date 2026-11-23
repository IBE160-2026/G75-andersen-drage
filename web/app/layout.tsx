import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import { SETTINGS_KEY, SETTINGS_SCHEMA_VERSION } from "../storage/settings";
import "../styles/tokens.css";
import "../styles/global.css";

// No metadata title: each Screen sets document.title on mount (a Next.js metadata title
// would overwrite it after hydration).

// AD-15: set data-theme and data-consent before first paint. While features.darkMode is
// false the theme is always light. data-consent is informational (CSS, tests): it reads
// the same key as storage/settings.ts, read-only and in try/catch; anything invalid → unset.
const PRE_PAINT =
  'document.documentElement.dataset.theme="light";' +
  `(function(){var c="unset";try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(SETTINGS_KEY)}));` +
  `if(s&&s.schemaVersion===${JSON.stringify(SETTINGS_SCHEMA_VERSION)}&&(s.consent==="accepted"||s.consent==="declined"))c=s.consent}catch(e){}` +
  "document.documentElement.dataset.consent=c})();";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
