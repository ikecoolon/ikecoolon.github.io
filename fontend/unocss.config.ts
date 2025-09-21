import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'
import carbonIcons from '@iconify-json/carbon/icons.json'
import mdiIcons from '@iconify-json/mdi/icons.json'

// 类型断言以修复 TypeScript 错误
const carbonIconCollection = carbonIcons as any
const mdiIconCollection = mdiIcons as any

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      collections: {
        carbon: carbonIconCollection,
        mdi: mdiIconCollection
      },
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      },
      // 确保图标在生产环境下正确显示
      warn: false
    })
  ],
  safelist: [
    // Ant Design 按钮相关样式
    'ant-btn',
    'ant-btn-primary',
    'ant-btn-secondary',
    'ant-btn-success',
    'ant-btn-warning',
    'ant-btn-danger',
    'ant-btn-link',
    'ant-btn-text',
    // 按钮状态
    'ant-btn:hover',
    'ant-btn:active',
    'ant-btn:focus',
    'ant-btn:disabled',
    // 按钮尺寸
    'ant-btn-lg',
    'ant-btn-sm',
    // 其他常用样式
    'ant-input',
    'ant-select',
    'ant-card',
    'ant-table',
    // 图标类名 - 确保生产环境下图标不被 tree-shaking 移除
    'i-carbon-arrow-left',
    'i-carbon-add',
    'i-carbon-calendar',
    'i-carbon-location',
    'i-carbon-edit',
    'i-carbon-trash-can',
    'i-carbon-campsite',
    'i-carbon-group',
    'i-carbon-time',
    'i-carbon-overflow-menu-horizontal',
    'i-carbon-email',
    'i-carbon-password',
    'i-carbon-login',
    'i-carbon-send',
    'i-carbon-information',
    'i-carbon-checkmark-outline',
    'i-carbon-warning',
    'i-carbon-refresh',
    'i-carbon-camp',
    'i-carbon-dashboard',
    'i-carbon-settings',
    'i-carbon-collapse-categories',
    'i-carbon-menu',
    'i-carbon-home',
    'i-carbon-user',
    'i-carbon-chevron-down',
    'i-carbon-logout',
    'i-carbon-sun',
    'i-carbon-moon',
    'i-carbon-task',
    'i-carbon-phone',
    'i-carbon-warning-hex'
  ],
  shortcuts: [
    // 常用布局类
    ['flex-center', 'flex items-center justify-center'],
    ['flex-col-center', 'flex flex-col items-center justify-center'],
    ['flex-between', 'flex items-center justify-between'],
    ['flex-around', 'flex items-center justify-around'],
    
    // 常用间距
    ['p-default', 'p-16px'],
    ['m-default', 'm-16px'],
    
    // 按钮样式
    ['btn', 'px-16px py-8px rounded-4px cursor-pointer transition-all duration-200'],
    ['btn-primary', 'btn bg-blue-500 text-white hover:bg-blue-600'],
    ['btn-secondary', 'btn bg-gray-200 text-gray-800 hover:bg-gray-300'],
    
    // 卡片样式
    ['card', 'bg-white rounded-8px shadow-sm p-16px'],
    ['card-hover', 'card hover:shadow-md transition-shadow duration-200'],
    
    // 文本样式
    ['text-title', 'text-18px font-600 text-gray-800'],
    ['text-subtitle', 'text-16px font-500 text-gray-700'],
    ['text-body', 'text-14px text-gray-600'],
    ['text-caption', 'text-12px text-gray-500'],
  ],
  theme: {
    colors: {
      primary: '#1890ff',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f',
      info: '#13c2c2'
    }
  }
})
