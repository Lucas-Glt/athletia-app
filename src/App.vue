<template>
  <RouterView />
  <ToastHote />
</template>

<script>
import { RouterView } from 'vue-router'
import ToastHote from './components/ToastHote.vue'
export default {
  components: { RouterView, ToastHote }
}
</script>
