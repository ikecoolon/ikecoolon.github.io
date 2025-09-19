<template>
  <div class="min-h-screen flex-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="w-400px">
      <!-- 登录卡片 -->
      <a-card class="shadow-lg rounded-12px">
        <div class="text-center mb-32px">
          <div class="text-28px font-700 text-gray-800 mb-8px">
            营会中心
          </div>
          <div class="text-14px text-gray-500">
            {{ loginMode === 'password' ? '请输入访问密码继续' : '输入邮箱获取临时密码' }}
          </div>
        </div>

        <!-- 登录模式切换 -->
        <div class="mb-24px flex justify-center">
          <a-radio-group v-model:value="loginMode" button-style="solid" size="small">
            <a-radio-button value="email">
              <i class="i-carbon:email mr-4px" />
              邮箱获取
            </a-radio-button>
            <a-radio-button value="password">
              <i class="i-carbon:password mr-4px" />
              密码登录
            </a-radio-button>
          </a-radio-group>
        </div>

        <a-form
          ref="formRef"
          :model="formData"
          :rules="currentFormRules"
          @finish="handleSubmit"
          layout="vertical"
        >
          <!-- 密码登录模式 -->
          <template v-if="loginMode === 'password'">
            <a-form-item label="邮箱地址" name="email">
              <a-input
                v-model:value="formData.email"
                size="large"
                placeholder="请输入邮箱地址"
                :disabled="loading"
              >
                <template #prefix>
                  <i class="i-carbon:email text-gray-400" />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item label="访问密码" name="password">
              <a-input-password
                v-model:value="formData.password"
                size="large"
                placeholder="请输入访问密码"
                :disabled="loading"
                @keydown.enter="handleSubmit"
              >
                <template #prefix>
                  <i class="i-carbon:password text-gray-400" />
                </template>
              </a-input-password>
            </a-form-item>
          </template>

          <!-- 邮箱获取模式 -->
          <template v-else>
            <a-form-item label="邮箱地址" name="email">
              <a-input
                v-model:value="formData.email"
                size="large"
                placeholder="请输入白名单邮箱地址"
                :disabled="loading"
                @keydown.enter="handleSubmit"
              >
                <template #prefix>
                  <i class="i-carbon:email text-gray-400" />
                </template>
              </a-input>
            </a-form-item>
          </template>

          <a-form-item>
            <a-button
              :type="loginMode === 'password' ? 'primary' : 'default'"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              :class="loginMode === 'email' ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : ''"
            >
              <i :class="loginMode === 'password' ? 'i-carbon:login' : 'i-carbon:send'" class="mr-4px" />
              {{ loginMode === 'password' ? '登录' : '发送密码' }}
            </a-button>
          </a-form-item>
        </a-form>

        <!-- 密码提示 -->
        <div class="mt-24px p-16px bg-blue-50 rounded-8px">
          <div class="text-12px text-gray-600 mb-4px">
            <i class="i-carbon:information text-blue-500 mr-4px" />
            {{ loginMode === 'password' ? '登录说明' : '邮箱说明' }}
          </div>
          <div class="text-12px text-gray-500 leading-relaxed" v-if="loginMode === 'password'">
            请输入您邮箱对应的最新密码。<br>
            如果密码错误，请重新获取最新密码。
          </div>
          <div class="text-12px text-gray-500 leading-relaxed" v-else>
            只有白名单中的邮箱才能接收临时密码。<br>
            密码有效期1小时，每次访问都需要最新密码。
          </div>
        </div>

        <!-- 状态提示 -->
        <div v-if="statusMessage" class="mt-16px p-12px rounded-6px"
             :class="statusType === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'">
          <i :class="statusType === 'success' ? 'i-carbon:checkmark-outline' : 'i-carbon:warning'"
             class="mr-4px" />
          {{ statusMessage }}
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import { useAuthStore } from '@/store/auth'
import {
  validateEmailFormat,
  sendPasswordToEmail
} from '@/utils/passwordGenerator'

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
const loginMode = ref<'password' | 'email'>('email')
const formRef = ref<FormInstance>()
const statusMessage = ref('')
const statusType = ref<'success' | 'error' |''>('')

// 表单数据
const formData = reactive({
  password: '',
  email: ''
})

// 表单验证规则
const passwordRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      validator: (_, value) => {
        if (!value) return Promise.resolve()
        if (!validateEmailFormat(value)) {
          return Promise.reject('请输入正确的邮箱格式')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入访问密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const emailRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      validator: (_, value) => {
        if (!value) return Promise.resolve()
        if (!validateEmailFormat(value)) {
          return Promise.reject('请输入正确的邮箱格式')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 计算属性
const currentFormRules = computed(() => {
  return loginMode.value === 'password' ? passwordRules : emailRules
})


/**
 * 显示状态消息
 */
const showStatusMessage = (message: string, type: 'success' | 'error' = 'success') => {
  statusMessage.value = message
  statusType.value = type
  setTimeout(() => {
    statusMessage.value = ''
  }, 5000)
}

/**
 * 处理提交
 */
const handleSubmit = async () => {
  try {
    loading.value = true
    statusMessage.value = ''

    // 表单验证
    await formRef.value?.validate()

    if (loginMode.value === 'password') {
      await handlePasswordLogin()
    } else {
      await handleEmailSend()
    }
  } catch (error) {
    console.error('提交失败:', error)
    showStatusMessage('操作失败，请稍后重试', 'error')
  } finally {
    loading.value = false
  }
}

/**
 * 处理密码登录
 */
const handlePasswordLogin = async () => {
  // 执行登录，传递邮箱信息
  const success = await authStore.login(formData.password, formData.email)

  if (success) {
    message.success('登录成功')

    // 跳转到目标页面
    const redirectPath = route.query.redirect as string || '/dashboard'
    router.push(redirectPath)
  } else {
    showStatusMessage('密码错误或邮箱无效，请重试', 'error')
    formData.password = ''
  }
}

/**
 * 处理邮箱发送
 */
const handleEmailSend = async () => {
  // 调试信息
  console.log('📧 发送密码邮件请求:', {
    email: formData.email,
    loginMode: loginMode.value
  })

  const result = await sendPasswordToEmail(formData.email)

  if (result.success) {
    showStatusMessage(result.message, 'success')
    formData.email = ''
  } else {
    showStatusMessage(result.message, 'error')
  }
}


// 初始化完成
</script>
