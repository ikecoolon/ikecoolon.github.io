<template>
  <div class="html-preview-container">
    <div :class="containerClass" :style="containerStyle">
      <iframe :src="src" :style="iframeStyle"></iframe>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HtmlPreview',
  props: {
    src: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'overview', // 'mobile', 'pc', 'overview'
      validator: function(value) {
        return ['mobile', 'pc', 'overview'].indexOf(value) !== -1
      }
    }
  },
  computed: {
    containerClass() {
      return {
        'preview-container': true,
        'mobile-container': this.type === 'mobile',
        'pc-container': this.type === 'pc',
        'overview-container': this.type === 'overview'
      }
    },
    containerStyle() {
      if (this.type === 'mobile') {
        return {
          width: '393px',  // iPhone 14 Pro width
          height: '852px', // iPhone 14 Pro height
          margin: '0 auto',
          border: '1px solid #eaecef',
          borderRadius: '40px',
          padding: '20px',
          backgroundColor: '#f5f5f5'
        }
      } else if (this.type === 'overview') {
        return {
          width: '100%',
          height: '700px',
          border: '1px solid #eaecef',
          borderRadius: '4px',
          overflow: 'hidden',
          margin: '1em 0'
        }
      }
      // PC style
      return {
        width: '100%',
        minHeight: '800px',
        border: '1px solid #eaecef',
        borderRadius: '4px',
        overflow: 'hidden'
      }
    },
    iframeStyle() {
      return {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: this.type === 'mobile' ? '20px' : '0'
      }
    }
  }
}
</script>

<style scoped>
.html-preview-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.mobile-container {
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.pc-container {
  width: 100%;
}

.overview-container {
  width: 100%;
}
</style> 