import { $ } from 'zx'

import { env } from './env.js'

export const setupUser = async () => {
  await $`git config user.name ${
    env.GITLAB_CI_USER_NAME || env.GITLAB_USER_NAME
  }`
  await $`git config user.email ${env.GITLAB_CI_USER_EMAIL}`
}

export const pullBranch = async (branch: string) => {
  await $`git pull origin ${branch}`
}

export const push = async (
  branch: string,
  { force }: { force?: boolean } = {},
) => {
  await $`git push origin HEAD:${branch} ${force && '--force'}`
}

export const pushTags = async () => {
  await $`git push origin --tags`
}

export const switchToMaybeExistingBranch = async (branch: string) => {
  const { stderr } = await $`git checkout ${branch}`

  const isCreatingBranch =
    !stderr.includes(`Switched to branch '${branch}'`) &&
    // it could be a detached HEAD
    !stderr.includes(`Switched to a new branch '${branch}'`)
  if (isCreatingBranch) {
    await $`git checkout -b ${branch}`
  }
}

export const reset = async (
  pathSpec: string,
  mode: 'hard' | 'mixed' | 'soft' = 'hard',
) => {
  await $`git reset --${mode} ${pathSpec}`
}

export const commitAll = async (message: string) => {
  await $`git add -A .`
  await $`git commit -m ${message}`
}

export const checkIfClean = async (): Promise<boolean> => {
  const { stdout } = await $`git status --porcelain`
  return stdout.length === 0
}
