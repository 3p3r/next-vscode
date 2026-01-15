const fs = require("fs");
const path = require("path");
const process = require("process");
const childProcess = require("child_process");

async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const p = childProcess.exec(
      command,
      {
        env: {
          ...process.env,
          NODE_OPTIONS: "--import tsx",
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      },
    );

    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);
  });
}

async function main() {
  const scriptsDirectory = path.join(__dirname, "scripts");
  const scriptFiles = fs
    .readdirSync(scriptsDirectory, { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith(".zx.ts"))
    .map((file) => path.join(scriptsDirectory, file.name));
  const sortedScripts = scriptFiles.sort();
  for (const scriptPath of sortedScripts) {
    await executeCommand(`npx zx ${scriptPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
