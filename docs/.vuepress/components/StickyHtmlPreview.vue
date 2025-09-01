<template>
  <div class="sticky-preview-wrapper">
    <div class="content-slot">
      <slot></slot>
    </div>
    <div class="sticky-preview" :style="stickyStyle">
      <HtmlPreview :src="src" :type="type" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'StickyHtmlPreview',
  props: {
    src: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'mobile'
    },
    width: {
      type: String,
      default: '393px'
    }
  },
  computed: {
    stickyStyle() {
      return {
        width: this.width
      }
    }
  }
}
</script>

<style scoped>
.sticky-preview-wrapper {
  display: flex;
  gap: 1rem;
  position: relative;
  max-width: 100%;
  margin: 0 -1rem;
  padding: 0 1rem;
}

.content-slot {
  flex: 1;
  max-width: calc(100% - 393px - 1rem);
  padding-right: 1rem;
}

.sticky-preview {
  position: sticky;
  top: 4rem;
  height: calc(100% - 3.5rem);
  overflow: hidden;
}
</style> 