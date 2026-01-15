import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next VSCode",
  description: "VSCode-web embedded in a Next.js app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="stylesheet"
          href="./vscode-web/out/vs/workbench/workbench.web.main.internal.css"
        />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        <script>
          const baseUrl = new URL('.', window.location.origin).toString();
          globalThis._VSCODE_FILE_ROOT = baseUrl + 'vscode-web/out/';
        </script>
        <script src="./vscode-web/out/nls.messages.js"></script>
        {children}
      </body>
    </html>
  );
}
