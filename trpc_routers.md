# Give me a very simple example of having multiple routers combined into one router and how you would call them from the front end

You're looking for an example of how to structure your tRPC backend with multiple "sub-routers" and then how to access procedures from those sub-routers on the frontend. This is a common and highly recommended practice for organizing larger tRPC applications.

Let's break it down into a very simple example.

## Combining Multiple tRPC Routers

### 1\. Server-side Setup

We'll create two simple sub-routers: `userRouter` and `postRouter`, and then combine them into our `appRouter`.

**Core tRPC setup (`server/trpc/trpc.ts`):**

This file remains the same as in the previous example, defining `publicProcedure` and `router`.

```typescript
// server/trpc/trpc.ts
import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;
export const router = t.router;
export const middleware = t.middleware; // Not strictly needed for this example, but good to include
```

**Context (`server/trpc/context.ts`):**

Also remains the same.

```typescript
// server/trpc/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import type { H3Event } from 'h3';

export async function createContext(event: H3Event) {
  return {};
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

**User Router (`server/trpc/routers/user.ts`):**

This router handles user-related procedures.

```typescript
// server/trpc/routers/user.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      // In a real app, you'd fetch from a database
      console.log(`Fetching user with ID: ${input.id}`);
      return { id: input.id, name: `User ${input.id}`, email: `user${input.id}@example.com` };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(2), email: z.string().email() }))
    .mutation(({ input }) => {
      // Simulate saving a new user
      console.log('Creating new user:', input);
      return { id: `user_${Date.now()}`, ...input };
    }),
});
```

**Post Router (`server/trpc/routers/post.ts`):**

This router handles post-related procedures.

```typescript
// server/trpc/routers/post.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const postRouter = router({
  getAll: publicProcedure
    .query(() => {
      // Simulate fetching all posts
      console.log('Fetching all posts');
      return [
        { id: 'post1', title: 'First Post', content: 'This is the content of the first post.' },
        { id: 'post2', title: 'Second Post', content: 'More exciting content here!' },
      ];
    }),

  add: publicProcedure
    .input(z.object({ title: z.string().min(5), content: z.string().min(10) }))
    .mutation(({ input }) => {
      // Simulate adding a new post
      console.log('Adding new post:', input);
      return { id: `post_${Date.now()}`, ...input };
    }),
});
```

**Main App Router (`server/trpc/routers/index.ts`):**

This is where you combine all your individual routers. We use `router.merge()` to nest them under specific keys.

```typescript
// server/trpc/routers/index.ts
import { router } from '../trpc';
import { userRouter } from './user'; // Import your sub-routers
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter, // Procedures under 'user' will be user.getById, user.create
  post: postRouter, // Procedures under 'post' will be post.getAll, post.add
  // You can also add top-level procedures directly here if needed
  greeting: publicProcedure.query(() => 'Hello from top-level router!'),
});

// Export the type definition of the combined API
export type AppRouter = typeof appRouter;
```

**Nuxt API Handler (`server/api/trpc/[trpc].ts`):**

This file remains the same, pointing to your combined `appRouter`.

```typescript
// server/api/trpc/[trpc].ts
import { createNuxtApiHandler } from 'trpc-nuxt';
import { appRouter } from '~/server/trpc/routers'; // Ensure this points to your combined router
import { createContext } from '~/server/trpc/context';

export default createNuxtApiHandler({
  router: appRouter,
  createContext,
});
```

### 2\. Client-side Call

Now, let's see how you would call these nested procedures from your Nuxt frontend.

**tRPC Client Plugin (`plugins/client.ts`):**

This file also remains largely the same. The key is that `AppRouter` now represents your combined router.

```typescript
// plugins/client.ts
import { createTRPCNuxtClient, httpBatchLink } from 'trpc-nuxt/client';
import type { AppRouter } from '~/server/trpc/routers'; // Import the AppRouter type from your combined router

export default defineNuxtPlugin(() => {
  const client = createTRPCNuxtClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
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

**Frontend Component (`pages/index.vue`):**

Notice how you access the procedures using dot notation, following the structure you defined with `router.merge()` on the server (`$client.user.getById`, `$client.post.getAll`, etc.).

```vue
<script setup lang="ts">
import { useNuxtApp } from '#app';
import { ref } from 'vue';

const { $client } = useNuxtApp();

// --- Calling User Router Procedures ---
const userId = ref('123');
const userQuery = await $client.user.getById.useQuery({ id: userId.value });

const newUserName = ref('');
const newUserEmail = ref('');
const createUserMutation = $client.user.create.useMutation({
  onSuccess: () => {
    alert('User created successfully!');
    newUserName.value = '';
    newUserEmail.value = '';
    // Optionally refetch user data or a list of users here
  },
  onError: (error) => {
    alert(`Error creating user: ${error.message}`);
  }
});

async function handleCreateUser() {
  if (newUserName.value && newUserEmail.value) {
    await createUserMutation.mutateAsync({
      name: newUserName.value,
      email: newUserEmail.value,
    });
  }
}

// --- Calling Post Router Procedures ---
const allPostsQuery = await $client.post.getAll.useQuery();

const newPostTitle = ref('');
const newPostContent = ref('');
const addPostMutation = $client.post.add.useMutation({
  onSuccess: () => {
    alert('Post added successfully!');
    newPostTitle.value = '';
    newPostContent.value = '';
    allPostsQuery.refresh(); // Refresh the list of posts after adding a new one
  },
  onError: (error) => {
    alert(`Error adding post: ${error.message}`);
  }
});

async function handleAddPost() {
  if (newPostTitle.value && newPostContent.value) {
    await addPostMutation.mutateAsync({
      title: newPostTitle.value,
      content: newPostContent.value,
    });
  }
}

// --- Calling Top-level Procedure ---
const greetingQuery = await $client.greeting.useQuery();
</script>

<template>
  <div>
    <h1>tRPC Multi-Router Example</h1>

    <h2>Top-level Greeting</h2>
    <p v-if="greetingQuery.pending.value">Loading greeting...</p>
    <p v-else-if="greetingQuery.error.value">Error: {{ greetingQuery.error.value?.message }}</p>
    <p v-else>{{ greetingQuery.data.value }}</p>

    <h2>User Management ($client.user.*)</h2>
    <h3>Fetch User by ID</h3>
    <p v-if="userQuery.pending.value">Loading user...</p>
    <p v-else-if="userQuery.error.value">Error: {{ userQuery.error.value?.message }}</p>
    <p v-else>User: {{ userQuery.data.value?.name }} ({{ userQuery.data.value?.email }})</p>

    <h3>Create New User</h3>
    <form @submit.prevent="handleCreateUser">
      <input v-model="newUserName" placeholder="Name" />
      <input v-model="newUserEmail" type="email" placeholder="Email" />
      <button :disabled="createUserMutation.isPending.value">
        {{ createUserMutation.isPending.value ? 'Creating...' : 'Create User' }}
      </button>
    </form>
    <p v-if="createUserMutation.isError.value" style="color: red;">
      {{ createUserMutation.error.value?.message }}
    </p>

    <h2>Post Management ($client.post.*)</h2>
    <h3>All Posts</h3>
    <p v-if="allPostsQuery.pending.value">Loading posts...</p>
    <p v-else-if="allPostsQuery.error.value">Error: {{ allPostsQuery.error.value?.message }}</p>
    <ul v-else>
      <li v-for="post in allPostsQuery.data.value" :key="post.id">
        <strong>{{ post.title }}</strong>: {{ post.content }}
      </li>
    </ul>

    <h3>Add New Post</h3>
    <form @submit.prevent="handleAddPost">
      <input v-model="newPostTitle" placeholder="Post Title" />
      <textarea v-model="newPostContent" placeholder="Post Content"></textarea>
      <button :disabled="addPostMutation.isPending.value">
        {{ addPostMutation.isPending.value ? 'Adding...' : 'Add Post' }}
      </button>
    </form>
    <p v-if="addPostMutation.isError.value" style="color: red;">
      {{ addPostMutation.error.value?.message }}
    </p>
  </div>
</template>
```

## Key Takeaways

1.  **Modularity:** Each distinct domain (users, posts, etc.) gets its own dedicated tRPC router file. This keeps your code organized and maintainable.
2.  **`router.merge()`:** The `router.merge()` function (or simply assigning sub-routers as properties to your main router object as shown here) is how you combine these individual routers into a single, cohesive API. The key names you use when merging (`user`, `post`) become the access points on the client.
3.  **Client-Side Access:** On the frontend, tRPC's type inference understands this nested structure. You access procedures using dot notation, e.g., `$client.user.getById` or `$client.post.getAll`. This provides excellent autocompletion and compile-time type safety.
4.  **`AppRouter` Type:** Exporting `AppRouter = typeof appRouter` from your main router is critical. It allows the client plugin to import this type and infer the entire API structure, ensuring end-to-end type safety.

This pattern scales very well for larger applications, allowing teams to work on different parts of the API concurrently without conflicts and maintaining a clear separation of concerns.

---

&nbsp;  
&nbsp;  
&nbsp;  
# Why now do you need to include the router name in the client side call, but when we had only one router, we didn't need to include it? 

This is an excellent observation and gets to the heart of how tRPC's structure and type inference work\!

When you had only one router, say `appRouter` with a procedure like `hello`:

```typescript
// server/trpc/routers/index.ts (only one router)
import { publicProcedure, router } from '../trpc';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello world'),
});

export type AppRouter = typeof appRouter;
```

And on the client:

```vue
// pages/index.vue
const { $client } = useNuxtApp();
const helloQuery = await $client.hello.useQuery(); // No router name here
```

The reason you don't need to include the router name (`hello` in this case) is because **`hello` is a direct property of the `appRouter` itself.**

Think of it like this:

  * **Single Router:**

    ```
    appRouter
    ├── hello (procedure)
    ├── anotherProcedure (procedure)
    └── etc.
    ```

    When you call `$client.hello`, you're directly accessing a top-level procedure within the *single* exposed router.

  * **Multiple Routers (merged):**
    When you introduced multiple routers and merged them like this:

    ```typescript
    // server/trpc/routers/index.ts (multiple routers merged)
    import { router } from '../trpc';
    import { userRouter } from './user';
    import { postRouter } from './post';

    export const appRouter = router({
      user: userRouter, // Merged as 'user'
      post: postRouter, // Merged as 'post'
      greeting: publicProcedure.query(() => 'Hello from top-level router!'), // Still a direct procedure
    });
    ```

    The structure of your `appRouter` (and thus your `AppRouter` type) now looks like this:

    ```
    appRouter
    ├── user (sub-router)
    │   ├── getById (procedure)
    │   └── create (procedure)
    ├── post (sub-router)
    │   ├── getAll (procedure)
    │   └── add (procedure)
    └── greeting (top-level procedure)
    ```

    Now, `getById` is no longer a direct property of `appRouter`. Instead, it's a property of the `userRouter`, which is *nested* under the `user` key in `appRouter`.

    Therefore, to access `getById`, you need to "traverse" the object structure: `$client.user.getById`. Similarly, for `getAll` in the `postRouter`, it's `$client.post.getAll`.

    The `greeting` procedure, however, is still a direct property of `appRouter`, so you can access it directly with `$client.greeting`.

**In essence:**

  * **`$client` is a client-side representation of your `appRouter`.**
  * **If a procedure is a direct property of `appRouter`, you access it directly.**
  * **If a procedure is a property of a sub-router that was merged into `appRouter` under a specific key, you use that key as an intermediary to access the procedure.**

tRPC's type inference is smart enough to understand this nested structure, which is why you get excellent autocompletion and type safety as you type `$client.`, then `$client.user.`, and so on. This hierarchical organization makes it much easier to manage complex APIs.