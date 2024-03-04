import { URL } from 'node:url'

import fs from 'fs-extra'
import { $ } from 'zx'

import { env } from './env.js'
import { setupUser } from './gitUtils.js'
import readChangesetState from './readChangesetState.js'
import { runPublish, runVersion } from './run.js'
import type { MainCommandOptions } from './types.js'
import { getUsername } from './utils.js'

import { createApi } from './index.js'

export const main = async ({
  published,
  onlyChangesets,
}: MainCommandOptions = {}) => {
  const {
    CI,
    GITLAB_HOST,
    GITLAB_TOKEN,
    HOME,
    NPM_TOKEN,
    DEBUG_GITLAB_CREDENTIAL = 'false',
    INPUT_PUBLISH,
    INPUT_CREATE_GITLAB_RELEASES,
    INPUT_VERSION,
    INPUT_COMMIT,
    INPUT_REMOVE_SOURCE_BRANCH,
    INPUT_TARGET_BRANCH,
    INPUT_TITLE,
  } = env

  fs.writeFileSync('published.json', 'false')
  fs.writeFileSync('publishedPackages.json', '[]')

  if (CI) {
    console.log('setting git user')
    await setupUser()

    const url = new URL(GITLAB_HOST)

    console.log('setting GitLab credentials')
    const username = await getUsername(createApi())

    const origin = `${url.protocol}//${username}:${GITLAB_TOKEN}@${
      url.host
      // eslint-disable-next-line unicorn/consistent-destructuring
    }${url.pathname.replace(/\/$/, '')}/${env.CI_PROJECT_PATH}.git`

    const verbose = $.verbose

    $.verbose = ['true', '1'].includes(DEBUG_GITLAB_CREDENTIAL)
    await $`git remote set-url origin ${origin}`
    $.verbose = verbose
  }

  const { changesets } = await readChangesetState()

  const publishScript = INPUT_PUBLISH
  const hasChangesets = changesets.length > 0
  const hasPublishScript = !!publishScript

  switch (true) {
    case !hasChangesets && !hasPublishScript: {
      console.log('No changesets found')
      return
    }
    case !hasChangesets && hasPublishScript: {
      console.log(
        'No changesets found, attempting to publish any unpublished packages to npm',
      )

      const npmrcPath = `${HOME}/.npmrc`
      if (fs.existsSync(npmrcPath)) {
        console.log('Found existing .npmrc file')
      } else if (NPM_TOKEN) {
        console.log('No .npmrc file found, creating one')
        fs.writeFileSync(
          npmrcPath,
          `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`,
        )
      } else {
        console.error(
          'No `.npmrc` found nor `NPM_TOKEN` provided, unable to publish packages',
        )
        process.exitCode = 1
        return
      }

      const result = await runPublish({
        script: publishScript,
        gitlabToken: GITLAB_TOKEN,
        createGitlabReleases:
          // TODO CHECK WHAT HAPPENS FOR EMPTY STRING AND UNDEFINED
          INPUT_CREATE_GITLAB_RELEASES?.toLowerCase() !== 'false',
      })

      if (result.published) {
        fs.writeFileSync('./published.json', 'true')
        fs.writeFileSync(
          './published-packages.json',
          JSON.stringify(result.publishedPackages, null, 2),
        )
        if (published) {
          await $`${published}`
        }
      }
      return
    }
    case hasChangesets: {
      await runVersion({
        script: INPUT_VERSION,
        gitlabToken: GITLAB_TOKEN,
        mrTitle: INPUT_TITLE,
        mrTargetBranch: INPUT_TARGET_BRANCH,
        commitMessage: INPUT_COMMIT,
        removeSourceBranch:
          INPUT_REMOVE_SOURCE_BRANCH?.toLowerCase() === 'true',
        hasPublishScript,
      })
      if (onlyChangesets) {
        await $`${onlyChangesets}`
      }
    }
  }
}
