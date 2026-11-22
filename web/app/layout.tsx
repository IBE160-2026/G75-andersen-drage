import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell/AppShell";
import "../styles/tokens.css";
import "../styles/global.css";

// No metadata title: each Screen sets document.title on mount (a Next.js metadata title
// would overwrite it after hydration).

// AD-15: set data-theme before first paint. While features.darkMode is false the theme is
// always light; Story 1.3 adds data-consent here.
const PRE_PAINT = 'document.documentElement.dataset.theme="light";';

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
