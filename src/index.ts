import { Events, Options, Routes } from 'discord.js'
import { SapphireClient } from '@sapphire/framework'
import { GuildCtxManager } from './guildCtx.js'
import { WorkerClientMap } from './worker.js'
import { readyEvent } from './events/index.js'

import { load } from './load.js'

let isCalledDestroy = false

const client = new SapphireClient({
  intents: [
    'Guilds',
    'GuildMembers',
    'GuildVoiceStates',
    'GuildMessages',
    'MessageContent',
  ],
  makeCache: Options.cacheWithLimits({
    BaseGuildEmojiManager: 0,
    GuildEmojiManager: 0,
    GuildForumThreadManager: 0,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    GuildTextThreadManager: 0,
    MessageManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
  }),
  loadMessageCommandListeners: true,
})

export const guildCtxManager = new GuildCtxManager(client)

export let workerClientMap: WorkerClientMap
export let workerReady = false
console.log(`pow - v${process.env.npm_package_version}`)

client.on(Events.ClientReady, async (c) => {
  readyEvent(c)
  workerClientMap = await new WorkerClientMap().init(
    process.env.WORKER_TOKENS,
    c,
  )
  workerReady = true
  await load({ client, guildCtxManager })
})

const destroy = async () => {
  if (!isCalledDestroy) {
    isCalledDestroy = true

    const promises: Promise<unknown>[] = []

    guildCtxManager.forEach((guildContext) => {
      guildContext.connectionManager.forEach((connectionContext) => {
        const promise = client.rest.post(
          Routes.channelMessages(connectionContext.readChannelId),
          {
            body: {
              embeds: [
                {
                  color: 0xffff00,
                  title: '再起動を行うためボイスチャンネルから退出します。',
                  description: '起動完了までしばらくお待ちください。',
                },
              ],
            },
          },
        )
        promises.push(promise)
      })
    })
    await Promise.allSettled(promises)
  }

  await client.destroy()
  for (const worker of workerClientMap.values()) {
    await worker.destroy()
  }
}

function handle(signal: NodeJS.Signals) {
  console.log(`Received ${signal}`)
  void destroy().then(() => process.exit())
}

process.on('SIGINT', handle)
process.on('SIGTERM', handle)
process.on('uncaughtException', (err) => {
  void destroy().then(() => {
    console.error('uncaughtException:\n%o', err)
    process.exit(1)
  })
})

void client.login()
