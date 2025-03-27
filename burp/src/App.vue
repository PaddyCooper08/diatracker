<script setup>
import CarbCalculator from "./components/CarbCalculator.vue";
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-10 px-4"
  >
    <main class="container mx-auto">
      <CarbCalculator />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}
</style>
