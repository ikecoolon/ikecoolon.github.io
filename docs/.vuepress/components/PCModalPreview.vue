<template>
  <div class="pc-modal-preview">
    <div class="preview-layout">
      <!-- 文档内容区域 -->
      <div class="content-area">
        <slot></slot>
      </div>
      
      <!-- 右侧固定按钮 -->
      <div class="button-area">
        <button 
          class="preview-button"
          @click="openModal"
        >
          🖥️ {{ buttonText }}
        </button>
      </div>
    </div>
    
    <!-- 自定义Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
        <iframe 
          :src="src" 
          frameborder="0" 
            class="modal-iframe"
        ></iframe>
      </div>
      
        <div class="modal-footer">
          <button class="modal-btn modal-btn-default" @click="closeModal">关闭</button>
          <button class="modal-btn modal-btn-primary" @click="openInNewTab">在新标签页打开</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PCModalPreview',
  props: {
    src: String,
    title: {
      type: String,
      default: '原型预览'
    },
    buttonText: {
      type: String,
      default: '查看原型'
    }
  },
  data() {
    return {
      isModalOpen: false
    }
  },
  methods: {
    openModal() {
      this.isModalOpen = true
      // 防止页面滚动
      document.body.style.overflow = 'hidden'
    },
    closeModal() {
      this.isModalOpen = false
      // 恢复页面滚动
      document.body.style.overflow = 'auto'
    },
    openInNewTab() {
      window.open(this.src, '_blank')
    }
  },
  beforeDestroy() {
    // 组件销毁时恢复页面滚动
    document.body.style.overflow = 'auto'
  }
}
</script>

<style scoped>
.pc-modal-preview {
  margin: 1rem 0;
}

.preview-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.content-area {
  flex: 1;
  min-width: 0;
}

.button-area {
  position: sticky;
  top: 5rem;
  flex-shrink: 0;
  width: 140px;
}

.preview-button {
  width: 100%;
  padding: 8px 16px;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.preview-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.preview-button:active {
  transform: translateY(0);
}

/* Modal 样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90vw;
  max-width: 1200px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  color: #262626;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8c8c8c;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #262626;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  padding: 0;
}

.modal-iframe {
  width: 100%;
  height: 70vh;
  border: none;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.modal-btn {
  padding: 6px 16px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.modal-btn:hover {
  border-color: #40a9ff;
  color: #40a9ff;
}

.modal-btn-primary {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.modal-btn-primary:hover {
  background: #40a9ff;
  border-color: #40a9ff;
}

@media (max-width: 768px) {
  .preview-layout {
    flex-direction: column;
    gap: 1rem;
  }
  
  .button-area {
    position: static;
    width: auto;
    text-align: center;
    order: -1;
  }
  
  .modal-container {
    width: 95vw;
    max-height: 95vh;
  }
  
  .modal-iframe {
    height: 60vh;
  }
}
</style> 