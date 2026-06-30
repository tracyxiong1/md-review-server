import { mkdtemp, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSkillStatus,
  handleSkillCommand,
  installOrUpdateSkill,
  SKILL_NAME,
} from './skill-manager.js';

describe('skill manager', () => {
  let homeDir;

  beforeEach(async () => {
    homeDir = await mkdtemp(join(tmpdir(), 'md-review-server-skill-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('installs the bundled markdown review loop skill', async () => {
    const result = installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
    });

    const target = join(homeDir, '.codex', 'skills', SKILL_NAME);
    expect(result.action).toBe('installed');
    expect(existsSync(join(target, 'SKILL.md'))).toBe(true);
    expect(await readFile(join(target, 'VERSION'), 'utf-8')).toBe('0.1.1\n');
  });

  it('skips update when installed version matches bundled version', async () => {
    installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
    });

    const result = installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
    });

    expect(result.action).toBe('skipped');
  });

  it('overwrites an installed skill when forced', async () => {
    installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
    });
    const target = join(homeDir, '.codex', 'skills', SKILL_NAME);
    await writeFile(join(target, 'SKILL.md'), 'local edit');

    const result = installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
      force: true,
    });

    expect(result.action).toBe('updated');
    expect(await readFile(join(target, 'SKILL.md'), 'utf-8')).toContain('Markdown Review Loop');
  });

  it('reports installed status', () => {
    installOrUpdateSkill({
      packageRoot: process.cwd(),
      env: { HOME: homeDir },
    });

    expect(getSkillStatus({ packageRoot: process.cwd(), env: { HOME: homeDir } })).toMatchObject({
      bundledVersion: '0.1.1',
      installedVersion: '0.1.1',
      installed: true,
      upToDate: true,
    });
  });

  it('handles CLI skill commands', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(
      handleSkillCommand({
        packageRoot: process.cwd(),
        env: { HOME: homeDir },
        argv: ['install', '--quiet'],
      }),
    ).toBe(0);
    expect(
      handleSkillCommand({
        packageRoot: process.cwd(),
        env: { HOME: homeDir },
        argv: ['doctor'],
      }),
    ).toBe(0);
    expect(log).toHaveBeenCalledWith('Skill: markdown-review-loop');
  });

  it('prints skill command help', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(
      handleSkillCommand({
        packageRoot: process.cwd(),
        env: { HOME: homeDir },
        argv: ['--help'],
      }),
    ).toBe(0);
    expect(log.mock.calls[0][0]).toContain('md-review-server skill install');
  });
});
