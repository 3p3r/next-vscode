import semver from "semver";
import { $, chalk, fs, path, useBash, within, which } from "zx";

$.verbose = true;

useBash();

const rootVscodeDir = path.join(__dirname, "../vscode");
const requiredTools = ["node", "git", "python"];

async function checkTools() {
  for (const tool of requiredTools) {
    if (!(await which(tool).catch(() => false))) {
      console.error(chalk.red(`${tool} is not installed`));
      process.exit(1);
    }
  }
}

async function checkNodeVersion(minMajorVersion = 22) {
  const nodeVersion = await $`node -v`;
  const currentNodeVersion = semver.parse(nodeVersion.stdout.trim());
  if (
    currentNodeVersion?.major &&
    currentNodeVersion?.major < minMajorVersion
  ) {
    console.error(chalk.red(`Node.js version is not v${minMajorVersion}`));
    process.exit(1);
  } else {
    console.log(chalk.green(`Node.js version is ${nodeVersion}`));
  }
}

async function cloneVSCode() {
  const vscodeVersion = "1.108.0";
  const vscodeDir = path.join(rootVscodeDir, "upstream");

  if (fs.existsSync(vscodeDir)) {
    console.log(chalk.yellow("Reusing existing vscode directory..."));
    return vscodeDir;
  }

  console.log(chalk.green("Cloning VSCode repository..."));
  await $`git clone https://github.com/microsoft/vscode.git ${vscodeDir} --depth 1 --branch ${vscodeVersion}`;
  console.log(chalk.green(`VSCode repository cloned to ${vscodeDir}`));
  return vscodeDir;
}

async function installVSCodeDependencies(vscodeDir: string) {
  await within(async () => {
    if (fs.existsSync(path.join(vscodeDir, "node_modules"))) {
      console.log(
        chalk.green("VSCode dependencies already installed, skipping install."),
      );
      return;
    }
    $.cwd = vscodeDir;
    $.env.NODE_OPTIONS = "";
    $.env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
    $.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
    await $`npm install`;
    console.log(chalk.green("VSCode dependencies installed"));
  });
}

async function copyVSCodeWorkbench(vscodeDir: string) {
  const workbenchFile = path.join(rootVscodeDir, "workbench.ts");
  await within(async () => {
    $.cwd = vscodeDir;
    await $`cp ${workbenchFile} src/vs/code/browser/workbench/workbench.ts`;
  });
  console.log(chalk.green("VSCode workbench copied"));
}

async function patchWorkerMemoryLimits(vscodeDir: string) {
  const transpilerPath = path.join(vscodeDir, "build/lib/tsb/transpiler.ts");
  let transpilerContent = fs.readFileSync(transpilerPath, "utf-8");
  const oldWorker =
    "private _worker = new threads.Worker(import.meta.filename);";
  const newWorker = `private _worker = new threads.Worker(import.meta.filename, {
		resourceLimits: { maxOldGenerationSizeMb: 8192 }
	});`;
  if (transpilerContent.includes(oldWorker)) {
    transpilerContent = transpilerContent.replace(oldWorker, newWorker);
    fs.writeFileSync(transpilerPath, transpilerContent, "utf-8");
    console.log(chalk.green("Patched transpiler.ts with memory limits"));
  }

  const manglePath = path.join(vscodeDir, "build/lib/mangle/index.ts");
  let mangleContent = fs.readFileSync(manglePath, "utf-8");
  const oldPool = `this.renameWorkerPool = workerpool.pool(path.join(import.meta.dirname, 'renameWorker.ts'), {
			maxWorkers: 4,
			minWorkers: 'max'
		});`;
  const newPool = `this.renameWorkerPool = workerpool.pool(path.join(import.meta.dirname, 'renameWorker.ts'), {
			maxWorkers: 4,
			minWorkers: 'max',
			workerType: 'process',
			forkOpts: { execArgv: ['--max-old-space-size=8192'] }
		});`;
  if (mangleContent.includes(oldPool)) {
    mangleContent = mangleContent.replace(oldPool, newPool);
    fs.writeFileSync(manglePath, mangleContent, "utf-8");
    console.log(chalk.green("Patched mangle/index.ts with memory limits"));
  }
}

async function buildVSCode(vscodeDir: string) {
  await within(async () => {
    $.cwd = vscodeDir;
    $.env.NODE_OPTIONS = "";
    await $`npm run gulp vscode-web-min`;
    console.log(chalk.green("VSCode built"));
  });
}

async function moveVSCodeWeb(
  vscodeArtifactsDir: string,
  vscodeWebOutputDir: string,
) {
  await $`mv ${vscodeArtifactsDir} ${vscodeWebOutputDir}`;
}

async function main() {
  const vscodeWebDir = path.join(__dirname, "../driver/public");
  if (fs.existsSync(vscodeWebDir)) {
    console.log(
      chalk.yellow("VSCode web directory already exists, skipping build."),
    );
    return;
  }
  await checkTools();
  await checkNodeVersion();
  const vscodeDir = await cloneVSCode();
  await installVSCodeDependencies(vscodeDir);
  await copyVSCodeWorkbench(vscodeDir);
  await patchWorkerMemoryLimits(vscodeDir);
  await buildVSCode(vscodeDir);
  const vscodeArtifactsDir = path.join(rootVscodeDir, "vscode-web");
  const vscodeWebOut = path.join(
    vscodeArtifactsDir,
    path.basename(vscodeWebDir),
  );
  if (fs.existsSync(vscodeWebOut)) {
    console.log(
      chalk.yellow("VSCode web output already exists, skipping move."),
    );
    return;
  }
  await moveVSCodeWeb(vscodeArtifactsDir, vscodeWebDir);
}

main()
  .then(() => {
    console.log(chalk.green("VSCode Build completed successfully"));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red("VSCode Build failed"));
    console.error(error);
    process.exit(1);
  });
