// docs/.vuepress/components/PdfPreview.vue
<template>
  <div class="pdf-container">
    <a :href="pdfPath" target="_blank" class="pdf-download-link">
      在新窗口中打开PDF
    </a>
    <iframe :src="pdfPath" width="100%" height="600px"></iframe>
  </div>
</template>

<script>
export default {
  props: {
    src: {
      type: String,
      required: true
    }
  },
  computed: {
    pdfPath() {
      return this.$withBase(this.src);
    }
  }
}
</script>

<style scoped>
.pdf-container {
  margin: 20px 0;
}
.pdf-download-link {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
}
</style>