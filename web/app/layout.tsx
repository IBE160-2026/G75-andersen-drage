import type { ReactNode } from "react";

export const metadata = {
  title: "Torsas læringsassistent",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb">
      <body>{children}</body>
    </html>
  );
}
