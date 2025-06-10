import { httpSubscriptionLink, loggerLink, splitLink } from '@trpc/client'
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client'
import type { AppRouter } from '~/server/trpc/routers'

export default defineNuxtPlugin(() => {
  const trpc = createTRPCNuxtClient<AppRouter>({
    links: [
      loggerLink(),
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: httpSubscriptionLink({
          url: '/api/trpc',
        }),
        false: httpBatchLink({
          url: '/api/trpc',
        }),
      }),
    ],
  })

  return {
    provide: {
      trpc,
    },
  }
})