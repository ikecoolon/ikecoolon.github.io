<template>
  <div class="min-h-screen flex-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="w-400px">
      <!-- 登录卡片 -->
      <a-card class="shadow-lg rounded-12px">
        <div class="text-center mb-32px">
          <div class="text-28px font-700 text-gray-800 mb-8px">
            营会管理系统
          </div>
          <div class="text-14px text-gray-500">
            请输入访问密码继续
          </div>
        </div>

        <a-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          @finish="handleLogin"
          layout="vertical"
        >
          <a-form-item label="访问密码" name="password">
            <a-input-password
              v-model:value="formData.password"
              size="large"
              placeholder="请输入访问密码"
              :disabled="loading"
              @keydown.enter="handleLogin"
            >
              <template #prefix>
                <i class="i-carbon:password text-gray-400" />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
            >
              登录
            </a-button>
          </a-form-item>
        </a-form>

        <!-- 密码提示 -->
        <div class="mt-24px p-16px bg-blue-50 rounded-8px">
          <div class="text-12px text-gray-600 mb-4px">
            <i class="i-carbon:information text-blue-500 mr-4px" />
            登录说明
          </div>
          <div class="text-12px text-gray-500 leading-relaxed">
            默认密码：admin123<br>
            登录后即可编辑系统数据。如需修改密码，请联系系统管理员。
          </div>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { useAuthStore } from '@/store/auth'

/**
 * 登录页面
 */

// 路由
const router = useRouter()
const route = useRoute()

// 状态管理
const authStore = useAuthStore()

// 响应式状态
const loading = ref(false)
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  password: ''
})

// 表单验证规则
const formRules: Record<string, Rule[]> = {
  password: [
    { required: true, message: '请输入访问密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

/**
 * 处理登录
 */
const handleLogin = async () => {
  try {
    loading.value = true
    
    // 表单验证
    await formRef.value?.validate()
    
    // 执行登录
    const success = await authStore.login(formData.password)
    
    if (success) {
      message.success('登录成功')
      
      // 跳转到目标页面
      const redirectPath = route.query.redirect as string || '/dashboard'
      router.push(redirectPath)
    } else {
      message.error('密码错误，请重试')
      formData.password = ''
    }
  } catch (error) {
    console.error('登录失败:', error)
    message.error('登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
