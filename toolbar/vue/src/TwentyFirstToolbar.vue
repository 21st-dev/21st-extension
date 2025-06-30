<script setup lang="ts">
import { initToolbar, type ToolbarConfig } from '@21st-extension/toolbar';
import { onMounted } from 'vue';

// Define props
const props = withDefaults(
  defineProps<{
    config?: ToolbarConfig;
    enabled?: boolean;
  }>(),
  {
    enabled: () => process.env.NODE_ENV === 'development',
  },
);

onMounted(() => {
  if (props.enabled) {
    initToolbar(props.config);
  }
});

// This component does not render any DOM elements itself
</script>

<template>
  <!-- This component is a functional component and does not render HTML -->
</template> 