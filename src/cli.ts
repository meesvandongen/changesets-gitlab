#!/usr/bin/env node

import _ from 'node:module'

import { program } from 'commander'

import { comment } from './comment.js'
import { env } from './env.js'
import { main } from './main.js'

const cjsRequire =
  typeof require === 'undefined' ? _.createRequire(import.meta.url) : require

const run = async () => {
  program.version(
    (cjsRequire('../package.json') as { version: string }).version,
  )

  program.command('comment').action(async () => {
    await comment()
  })

  program
    .command('main', {
      isDefault: true,
    })
    .action(() =>
      main({
        published: env.INPUT_PUBLISHED,
        onlyChangesets: env.INPUT_ONLY_CHANGESETS,
      }),
    )

  return program.showHelpAfterError().parseAsync()
}

run().catch((err: Error) => {
  console.error(err)
  process.exitCode = 1
})
