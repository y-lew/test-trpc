# tRPC with Nuxt - Complete Guide

tRPC with Nuxt provides a fantastic developer experience by giving you end-to-end type safety between your frontend and backend. This guide demonstrates a complete setup with examples.

## 🚀 Quick Start Example

This example demonstrates a simple "hello world" endpoint with full type safety.

## 1. Server-side Setup (tRPC Router)

### Root tRPC Configuration

**`server/trpc/trpc.ts`**

```typescript
import { initTRPC } from '@trpc/server';
import { Context } from './context';

/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v10/router
 * @see https://trpc.io/docs/v10/procedures
 */
const t = initTRPC.context<Context>().create();

/**
 * Unprotected procedure
 **/
export const publicProcedure = t.procedure;
export const router = t.router;
export const middleware = t.middleware;
```

### Context Setup (Optional)

**`server/trpc/context.ts`**

You can define a context that will be available in all your tRPC procedures. This is useful for things like authentication, database connections, etc.

```typescript
import { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/context
 */
export async function createContext(event: H3Event) {
  // You can add anything here that you want to be accessible in your tRPC procedures
  // e.g., user session, database client.
  return {};
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

### Define Your API Procedures

**`server/trpc/routers/index.ts`**

```typescript
import { z } from 'zod'; // For input validation
import { publicProcedure, router } from '../trpc';

export const appRouter = router({
  hello: publicProcedure
    .input(
      z.object({
        text: z.string().nullish(),
      })
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input?.text ?? 'world'}`,
      };
    }),
  
  // You can add more procedures here, e.g., mutations, other queries
  createUser: publicProcedure
    .input(z.object({ name: z.string().min(3) }))
    .mutation(({ input }) => {
      // In a real app, you'd save this to a database
      const newUser = { id: `id_${input.name.toLowerCase()}`, name: input.name };
      return newUser;
    }),
});

// Export type definition of API
export type AppRouter = typeof appRouter;
```

### Nuxt API Handler

**`server/api/trpc/[trpc].ts`**

This file acts as the bridge between Nuxt's server routes and your tRPC router. The `[trpc].ts` syntax creates a catch-all route for `api/trpc/*`.

```typescript
import { createNuxtApiHandler } from 'trpc-nuxt';
import { appRouter } from '~/server/trpc/routers';
import { createContext } from '~/server/trpc/context';

// Export API handler
export default createNuxtApiHandler({
  router: appRouter,
  createContext, // Provide your context factory
});
```

## 2. Client-side Setup (tRPC Client)

### Create tRPC Client Plugin

**`plugins/client.ts`**

```typescript
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import type { AppRouter } from '~/server/trpc/routers';

export default defineNuxtPlugin(() => {
  /**
   * createTRPCNuxtClient adds a `useQuery` composable
   * built on top of `useAsyncData`.
   */
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc', // This should match your server/api/trpc/[trpc].ts path
      }),
    ],
  });

  return {
    provide: {
      client,
    },
  };
});
```

### Using tRPC in Components

**`pages/index.vue`**

```vue
<script setup lang="ts">
import { useNuxtApp } from '#app';

const { $client } = useNuxtApp();

// --- Query Example (fetching data) ---

// Using the `useQuery` composable (recommended for Nuxt)
const helloQuery = await $client.hello.useQuery({ text: 'Nuxt client' });

// You can also use the vanilla `query` method for direct calls
const vanillaHello = await $client.hello.query({ text: 'vanilla' });

// --- Mutation Example (sending data) ---

// Using the `useMutation` composable for mutations
const createUserMutation = $client.createUser.useMutation();

const newUserResult = ref<any>(null); // To store the result of the mutation

async function handleCreateUser() {
  try {
    newUserResult.value = await createUserMutation.mutateAsync({ name: 'Frodo' });
    console.log('New User Created:', newUserResult.value);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

// You can also use the vanilla `mutate` method for direct calls
async function handleVanillaCreateUser() {
  try {
    const frodo = await $client.createUser.mutate({ name: 'Gandalf' });
    console.log('Vanilla New User Created:', frodo);
  } catch (error) {
    console.error('Error creating user with vanilla mutate:', error);
  }
}
</script>

<template>
  <div>
    <h1>tRPC Nuxt Example</h1>

    <h2>Hello Query (with useQuery)</h2>
    <p v-if="helloQuery.pending.value">Loading...</p>
    <p v-else-if="helloQuery.error.value">Error: {{ helloQuery.error.value?.message }}</p>
    <p v-else>{{ helloQuery.data.value?.greeting }}</p>

    <h2>Hello Query (vanilla query)</h2>
    <p>{{ vanillaHello.greeting }}</p>

    <h2>Create User Mutation</h2>
    <button @click="handleCreateUser" :disabled="createUserMutation.isPending.value">
      {{ createUserMutation.isPending.value ? 'Creating...' : 'Create Frodo' }}
    </button>
    <p v-if="newUserResult">Created User: {{ newUserResult.name }} (ID: {{ newUserResult.id }})</p>
    <p v-if="createUserMutation.isError.value" style="color: red;">
      Error creating user: {{ createUserMutation.error.value?.message }}
    </p>

    <button @click="handleVanillaCreateUser">Create Gandalf (Vanilla Mutate)</button>
  </div>
</template>
```

## 📋 Key Components Explained

### Server Side

- **`server/trpc/trpc.ts`**: Initializes tRPC and exports `publicProcedure` and `router`. The `publicProcedure` is a base procedure without any special middleware (like authentication).

- **`server/trpc/context.ts`**: Defines a `createContext` function that runs on each incoming request. This is where you'd set up things like database connections or user session information.

- **`server/trpc/routers/index.ts`**: Where you define your actual API endpoints:
  - `hello`: A query procedure with optional text input that returns a greeting
  - `createUser`: A mutation procedure that takes a name and simulates creating a user
  - `export type AppRouter`: Crucial for tRPC's type inference - provides full type safety

- **`server/api/trpc/[trpc].ts`**: Nuxt server route that catches all requests to `/api/trpc/*` and forwards them to your tRPC router.

### Client Side

- **`plugins/client.ts`**: Nuxt plugin that runs on client-side startup:
  - Creates a strongly typed tRPC client instance
  - Uses `httpBatchLink` for performance optimization
  - Makes client available globally via `useNuxtApp().$client`

- **Component Usage**: Access the tRPC client and use either direct calls or composables for reactive state management.

---

## 🔄 Query vs. useQuery & Mutation vs. useMutation

Understanding the difference between direct calls and composables is crucial for effective tRPC usage.

## Query Methods

### `query` (Direct Call)

**What it is**: A direct, promise-based call to your tRPC server.

**Syntax**: `$client.yourProcedure.query(input)`

**Returns**: A Promise that resolves with the data

**When to use**:
- Server-side rendering (SSR) or Static Site Generation (SSG)
- One-off fetches that don't need reactivity
- Outside of component context

**Characteristics**:
- ❌ No built-in reactivity
- ❌ No automatic refetching
- ❌ No caching
- ✅ Simple and direct

**Example**:
```vue
<script setup lang="ts">
const { $client } = useNuxtApp();

// Runs once when component is created (or during SSR)
const { greeting } = await $client.hello.query({ text: 'direct query' });
</script>

<template>
  <p>Greeting from direct query: {{ greeting }}</p>
</template>
```

### `useQuery` (Composable)

**What it is**: A composable that provides reactive state management for data fetching.

**Syntax**: `$client.yourProcedure.useQuery(input, options)`

**Returns**: Reactive object with `data`, `pending`, `error`, `refresh`, etc.

**When to use**:
- Client-side rendering with reactive UI updates
- When you need loading/error states
- For automatic caching and refetching

**Characteristics**:
- ✅ Reactive state management
- ✅ Lifecycle aware
- ✅ Intelligent caching
- ✅ Automatic refetching strategies
- ✅ Built-in error handling

**Example**:
```vue
<script setup lang="ts">
const { $client } = useNuxtApp();

const { data: helloData, pending: helloLoading, error: helloError, refresh: refetchHello } = 
  await $client.hello.useQuery({ text: 'useQuery example' });

function handleRefresh() {
  refetchHello();
}
</script>

<template>
  <div>
    <p v-if="helloLoading">Loading...</p>
    <p v-else-if="helloError">Error: {{ helloError?.message }}</p>
    <p v-else>{{ helloData?.greeting }}</p>
    <button @click="handleRefresh">Refetch</button>
  </div>
</template>
```

## Mutation Methods

### `mutate` (Direct Call)

**What it is**: A direct, promise-based call for data modifications.

**Syntax**: `$client.yourProcedure.mutate(input)`

**Returns**: A Promise that resolves with the mutation result

**When to use**:
- Server-side actions during SSR
- Fire-and-forget operations
- Outside of component context

**Characteristics**:
- ❌ No built-in reactivity
- ❌ No automatic query invalidation
- ✅ Simple and direct

**Example**:
```typescript
// In a store or utility function
export async function createNewUser(name: string) {
  const { $client } = useNuxtApp();
  try {
    const user = await $client.createUser.mutate({ name });
    console.log('User created:', user);
    return user;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}
```

### `useMutation` (Composable)

**What it is**: A composable designed to manage the lifecycle of data modification requests.

**Syntax**: `$client.yourProcedure.useMutation(options)`

**Returns**: Reactive object with `mutate`, `mutateAsync`, `isPending`, `isError`, `data`, etc.

**When to use**:
- Interactive forms and buttons
- When you need loading/error feedback
- For optimistic updates
- To automatically invalidate related queries

**Characteristics**:
- ✅ Reactive state management
- ✅ `mutate` and `mutateAsync` methods
- ✅ Success/error/settled callbacks
- ✅ Automatic query invalidation
- ✅ Optimistic updates support

**Example**:
```vue
<script setup lang="ts">
const { $client } = useNuxtApp();
const newUserName = ref('');

const createUserMutation = $client.createUser.useMutation({
  onSuccess: (data) => {
    console.log('User created successfully:', data);
    newUserName.value = ''; // Clear input
  },
  onError: (error) => {
    console.error('Error creating user:', error.message);
  }
});

async function handleSubmit() {
  if (!newUserName.value) return;
  try {
    const result = await createUserMutation.mutateAsync({ name: newUserName.value });
    console.log('Mutation completed:', result);
  } catch (error) {
    console.error('Submit failed:', error);
  }
}
</script>

<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <input type="text" v-model="newUserName" placeholder="Enter user name" />
      <button type="submit" :disabled="createUserMutation.isPending.value">
        {{ createUserMutation.isPending.value ? 'Creating...' : 'Create User' }}
      </button>
    </form>
    <p v-if="createUserMutation.isError.value" style="color: red;">
      Error: {{ createUserMutation.error.value?.message }}
    </p>
    <p v-if="createUserMutation.isSuccess.value" style="color: green;">
      User created! ID: {{ createUserMutation.data.value?.id }}
    </p>
  </div>
</template>
```

## 📊 Comparison Summary

| Feature | Direct Calls (`query`/`mutate`) | Composables (`useQuery`/`useMutation`) |
|---------|----------------------------------|----------------------------------------|
| **Reactivity** | None (manual management) | Built-in (reactive data, pending, error) |
| **Lifecycle Aware** | No | Yes (integrates with component lifecycle) |
| **Loading State** | Manual | Automatic (pending/isLoading) |
| **Error State** | Manual (try/catch) | Automatic (error) |
| **Caching** | No built-in | Yes (from underlying library) |
| **Refetching** | Manual | Automatic (on focus, reconnect, invalidate) |
| **Best For** | SSR/SSG, one-off, non-reactive fetches | CSR, interactive UIs, complex state management |

## 🎯 Best Practices

- **Use composables (`useQuery`/`useMutation`) for interactive client-side applications** - they provide superior state management and developer experience
- **Use direct calls (`query`/`mutate`) for SSR/SSG scenarios** or when you don't need reactive state
- **Always export your router type** (`export type AppRouter`) for full type safety
- **Use Zod for input validation** to ensure runtime and compile-time safety
- **Leverage context for shared resources** like database connections and authentication

This setup gives you a powerful and type-safe way to build full-stack applications with Nuxt and tRPC! 🚀