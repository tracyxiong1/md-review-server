import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

export const SKILL_NAME = 'markdown-review-loop';

export function getCodexHome(env = process.env) {
  return env.CODEX_HOME || join(env.HOME || process.cwd(), '.codex');
}

export function getSkillPaths(packageRoot, env = process.env) {
  const codexHome = getCodexHome(env);
  return {
    source: resolve(packageRoot, 'skills', SKILL_NAME),
    target: resolve(codexHome, 'skills', SKILL_NAME),
    codexHome,
  };
}

function readVersion(skillDir) {
  const versionPath = join(skillDir, 'VERSION');
  if (!existsSync(versionPath)) {
    return null;
  }
  return readFileSync(versionPath, 'utf-8').trim() || null;
}

function copySkill(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
}

export function installOrUpdateSkill({
  packageRoot,
  env = process.env,
  force = false,
  quiet = false,
} = {}) {
  const { source, target } = getSkillPaths(packageRoot, env);
  if (!existsSync(source)) {
    throw new Error(`Bundled skill not found: ${source}`);
  }

  const bundledVersion = readVersion(source);
  if (!bundledVersion) {
    throw new Error(`Bundled skill VERSION is missing: ${source}`);
  }

  const installedVersion = readVersion(target);
  if (!force && installedVersion === bundledVersion) {
    if (!quiet) {
      console.log(`${SKILL_NAME} is already up to date (${bundledVersion}).`);
    }
    return { action: 'skipped', version: bundledVersion, target };
  }

  copySkill(source, target);
  writeFileSync(join(target, 'VERSION'), `${bundledVersion}\n`);

  if (!quiet) {
    const action = installedVersion ? 'Updated' : 'Installed';
    console.log(`${action} ${SKILL_NAME} ${bundledVersion} to ${target}`);
  }

  return {
    action: installedVersion ? 'updated' : 'installed',
    version: bundledVersion,
    previousVersion: installedVersion,
    target,
  };
}

export function getSkillStatus({ packageRoot, env = process.env } = {}) {
  const { source, target } = getSkillPaths(packageRoot, env);
  const bundledVersion = readVersion(source);
  const installedVersion = readVersion(target);
  const installed = existsSync(join(target, 'SKILL.md'));

  return {
    source,
    target,
    bundledVersion,
    installedVersion,
    installed,
    upToDate: Boolean(installed && bundledVersion && installedVersion === bundledVersion),
  };
}

export function printSkillStatus(status) {
  console.log(`Skill: ${SKILL_NAME}`);
  console.log(`Bundled: ${status.bundledVersion || 'missing'}`);
  console.log(`Installed: ${status.installedVersion || 'missing'}`);
  console.log(`Path: ${status.target}`);
  console.log(
    `Status: ${status.upToDate ? 'up to date' : status.installed ? 'update available' : 'not installed'}`,
  );
}

export function printSkillHelp() {
  console.log(`
Usage:
  md-review-server skill install [--force] [--quiet]
  md-review-server skill update [--force] [--quiet]
  md-review-server skill doctor

Examples:
  npx -y md-review-server@latest skill install
  npx -y md-review-server@latest skill update --quiet
  md-review-server skill doctor
`);
}

export function handleSkillCommand({ packageRoot, argv, env = process.env } = {}) {
  const subcommand = argv[0] || 'doctor';
  const force = argv.includes('--force');
  const quiet = argv.includes('--quiet');

  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printSkillHelp();
    return 0;
  }

  if (subcommand === 'install' || subcommand === 'update') {
    installOrUpdateSkill({ packageRoot, env, force, quiet });
    return 0;
  }

  if (subcommand === 'doctor' || subcommand === 'status') {
    printSkillStatus(getSkillStatus({ packageRoot, env }));
    return 0;
  }

  console.error(`Unknown skill command: ${subcommand}`);
  console.error('Usage: md-review-server skill <install|update|doctor> [--force] [--quiet]');
  return 1;
}
