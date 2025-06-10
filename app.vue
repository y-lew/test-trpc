<template>
  <div>
    <div>{{ hello?.greeting }}</div>
    <div>{{ stream }}</div>
  </div>
</template>

<script setup lang="ts">
const { $trpc } = useNuxtApp()

const text = 'I like Nuxt 3 and tRPC'

const { data: hello } = await $trpc.hello.useQuery({ text })

const stream = ref<string | null>(null)

$trpc.teststream.subscribe({
  text,
}, {
  onData: (data) => {
    console.log('Received data:', data)
    stream.value = data
  },
  onError: (error) => {
    console.error('Error:', error)
  },
})
</script>
