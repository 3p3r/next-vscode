// from:
// https://github.com/microsoft/vscode-extension-samples/blob/0c01b9ad1cbd411b1baf44dc87d040c6258c6440/fsprovider-sample/src/extension.ts

import * as vscode from "vscode";
import { MemFS } from "./fileSystemProvider";

export function activate(context: vscode.ExtensionContext) {
  const memFs = new MemFS();

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("memfs", memFs, {
      isCaseSensitive: true,
    }),
  );
  let initialized = false;

  context.subscriptions.push(
    vscode.commands.registerCommand("memfs.reset", (_) => {
      for (const [name] of memFs.readDirectory(vscode.Uri.parse("memfs:/"))) {
        memFs.delete(vscode.Uri.parse(`memfs:/${name}`));
      }
      initialized = false;
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("memfs.init", (_) => {
      if (initialized) {
        return;
      }
      initialized = true;
      // todo: populate with boot files
    }),
  );

  vscode.workspace.updateWorkspaceFolders(0, 0, {
    uri: vscode.Uri.parse("memfs:/"),
    name: "Ephemeral MemFS Workspace",
  });
}
