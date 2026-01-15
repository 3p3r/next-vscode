import { $, chalk, fs, path, useBash, within, glob } from "zx";

$.verbose = true;

useBash();

async function main() {
  const extensionsVSCodeDir = path.join(
    __dirname,
    "../driver/public/extensions",
  );
  await $`mkdir -p ${extensionsVSCodeDir}`;

  const extensionsRootDir = path.join(__dirname, "../extensions");
  const allExtensionRoots = await glob("*/extension.ts", {
    cwd: extensionsRootDir,
    absolute: true,
  });

  for (const extPath of allExtensionRoots) {
    // const buildOutput = extPath.replace(/extension\.ts$/, "extension.js");
    // if (fs.existsSync(buildOutput)) {
    //   console.log(
    //     chalk.yellow(
    //       `Skipping build for extension (output exists): ${extPath}`,
    //     ),
    //   );
    //   continue;
    // }

    await within(async () => {
      $.cwd = path.dirname(extPath);
      if (!fs.existsSync(path.join($.cwd, "node_modules"))) {
        console.log(
          chalk.blue(`Installing dependencies for extension: ${extPath}`),
        );
        await $`npm install`;
      }
      const extensionName = path.basename(path.dirname(extPath));
      const destDir = path.join(extensionsVSCodeDir, extensionName);
      await $`rm -rf ${destDir}`;
      await $`mkdir -p ${destDir}`;
      console.log(chalk.blue(`Building extension: ${extPath}`));
      await $`npm run build`;
      await $`cp extension.js ${destDir}/extension.js`;
      const packageJsonPath = path.join($.cwd, "package.json");
      await $`cp ${packageJsonPath} ${destDir}/package.json`;
      const packageNlsJsonPath = path.join(destDir, "package.nls.json");
      await fs.promises.writeFile(packageNlsJsonPath, "{}");
      console.log(chalk.green(`Built and copied extension to: ${destDir}`));
    });
  }
}

main()
  .then(() => {
    console.log(chalk.green("VSCode extensions built successfully"));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red("VSCode extensions build failed"));
    console.error(error);
    process.exit(1);
  });
