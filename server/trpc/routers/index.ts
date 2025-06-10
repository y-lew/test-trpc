import { baseProcedure, createTRPCRouter } from '~/server/trpc/init'
import { z } from 'zod'

export const appRouter = createTRPCRouter({
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),
  teststream: baseProcedure
    .input(
      z.object({
        text: z.string(),
      }),
    )
    .subscription(async function* (opts) {
      const { text } = opts.input;
      for (let i = 0; i < 5; i++) {
        yield `hello ${text} ${i}`;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;