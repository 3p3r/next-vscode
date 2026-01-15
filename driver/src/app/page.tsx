"use client";

import type { create } from "../../../vscode/upstream/src/vs/workbench/workbench.web.main.internal";

const dynImport = (modulePath: string) => {
  return Function(`return import("${modulePath}");`)();
};

const importVSCode = async () => {
  const pageUrl = new URL(window.location.href);
  const vscode = await dynImport(
    `${pageUrl.origin}/vscode-web/out/vs/workbench/workbench.web.main.internal.js`,
  );
  return vscode.create as typeof create;
};

const installVSCode = async (el: HTMLElement) => {
  const pageUrl = new URL(window.location.href);
  const createVSCode = await importVSCode();
  return createVSCode(el, {
    configurationDefaults: {
      "window.commandCenter": false,
      "workbench.secondarySideBar.defaultVisibility": "hidden",
      "workbench.layoutControl.enabled": false,
      "workbench.startupEditor": "none",
      "workbench.tips.enabled": false,
      "workbench.welcomePage.walkthroughs.openOnInstall": false,
    },
    additionalBuiltinExtensions: [
      {
        scheme: "http",
        authority: pageUrl.host,
        path: "/extensions/filesystem",
      },
    ],
  });
};

export default function Home() {
  let instance: Awaited<ReturnType<typeof installVSCode>> | null = null;
  return (
    <div
      style={{ width: "100vw", height: "100vh" }}
      ref={(el) => {
        if (el) {
          installVSCode(el)
            .then((inst) => {
              instance = inst;
            })
            .catch((err) => {
              console.error("Failed to initialize VSCode:", err);
            });
        } else {
          instance?.dispose();
          instance = null;
        }
      }}
    >
      {/* VSCode will be mounted here. */}
    </div>
  );
}
