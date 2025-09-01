<template>
  <div class="product-list">
    <div v-if="groupedProducts.length > 0">
      <div class="product-card" v-for="group in groupedProducts" :key="group.id">
        <h3>
          {{ group.title }}
        </h3>
        <div class="product-info">
          <span class="product-date">{{ formatDate(group.date) }}</span>
          <span class="product-type">{{ getProductTypeName(group.type) }}</span>
        </div>
        <div class="product-tags">
          <span class="tag" v-for="tag in group.tags" :key="tag">{{ tag }}</span>
        </div>
        <div class="product-versions">
          <h4>相关文档:</h4>
          <ul>
            <li v-for="version in group.allVersions" :key="version.path">
              <router-link :to="version.path">{{ version.title }}</router-link>
              <span class="version-date">{{ formatDate(version.date) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div v-else class="no-products">
      暂无相关产品文档
    </div>
  </div>
</template>

<script>
import moment from 'moment';

export default {
  name: 'ProductList',
  props: {
    year: {
      type: String,
      required: false
    },
    month: {
      type: String,
      required: false
    },
    type: {
      type: String,
      required: false
    },
    directory: {
      type: String,
      required: false,
      default: ''
    }
  },
  data() {
    return {
      moment,
      productTypeNames: {
        'charging-products': '电商产品',
        'virtual-power': '其他产品',
        'personal-products': '个人产品',
      }
    }
  },
  computed: {
    // 获取所有产品页面
    allProducts() {
      // 获取所有页面
      const pages = this.$site.pages
      
      // 筛选产品页面（frontmatter中包含title、date和type的页面）
      return pages.filter(page => {
        // 检查目录路径是否匹配
        const isInDirectory = this.directory ? page.path.includes(`/products/${this.directory}/`) : page.path.includes('/products/');
        
        return page.frontmatter.title && 
               page.frontmatter.date && 
               page.frontmatter.type &&
               !page.path.endsWith('README.html') && // 排除索引页
               isInDirectory
      }).map(page => {
        return {
          title: page.frontmatter.title,
          path: page.path,
          date: page.frontmatter.date, // 保持原始日期格式
          type: page.frontmatter.type,
          tags: page.frontmatter.tags || [],
          // 提取产品项目标识符
          projectId: this.extractProjectId(page.path)
        }
      }).sort((a, b) => {
        // 按日期降序排序
        return new Date(b.date) - new Date(a.date)
      })
    },
    
    // 根据props过滤的产品
    filteredProducts() {
      let result = this.allProducts
      
      // 如果指定了年份，按年份筛选
      if (this.year) {
        result = result.filter(product => {
          const productYear = new Date(product.date).getFullYear().toString()
          return productYear === this.year
        })
      }
      
      // 如果指定了月份，按月份筛选
      if (this.month) {
        result = result.filter(product => {
          const productMonth = (new Date(product.date).getMonth() + 1).toString().padStart(2, '0')
          return productMonth === this.month
        })
      }
      
      // 如果指定了类型，按类型筛选
      if (this.type) {
        result = result.filter(product => product.type === this.type)
      }
      
      return result
    },
    
    // 将产品按项目分组
    groupedProducts() {
      const groupMap = new Map()
      
      // 遍历所有过滤后的产品，按项目ID进行分组
      this.filteredProducts.forEach(product => {
        const projectId = product.projectId
        
        if (!groupMap.has(projectId)) {
          // 创建新的项目组
          groupMap.set(projectId, {
            id: projectId,
            title: this.getProjectTitle(product.title),
            mainPath: product.path,
            date: product.date, // 保持原始日期格式
            type: product.type,
            tags: product.tags,
            versions: [],
            allVersions: []
          })
        }
        
        const group = groupMap.get(projectId)
        
        // 添加到所有版本列表
        group.allVersions.push({
          title: this.getVersionTitle(product.title),
          path: product.path,
          date: product.date // 保持原始日期格式
        })
      })
      
      // 转换Map为数组并排序
      const result = Array.from(groupMap.values()).sort((a, b) => {
        return new Date(b.date) - new Date(a.date)
      })
      
      // 对每个组内的版本进行排序
      result.forEach(group => {
        group.allVersions.sort((a, b) => {
          return new Date(b.date) - new Date(a.date)
        })
      })
      
      return result
    }
  },
  methods: {
    // 获取产品类型名称
    getProductTypeName(type) {
      return this.productTypeNames[type] || type
    },
    
    // 从路径中提取项目标识符
    extractProjectId(path) {
      // 例如从 "/products/charging-products/2025/5-merchant-mini-program/..." 提取 "5-merchant-mini-program"
      const match = path.match(/\/products\/[\w-]+\/\d+\/([\w-]+)\//)
      return match ? match[1] : path
    },
    
    // 获取项目主标题
    getProjectTitle(title) {
      // 可以根据需要调整标题格式
      return title.replace(/[一二三四五六七八九十]稿$/, '').trim()
    },
    
    // 获取版本标题
    getVersionTitle(title) {
      // 提取"X稿"的信息
      const match = title.match(/([一二三四五六七八九十]稿)/)
      return match ? match[1] : title
    },
    
    // 格式化日期，保持与MD文件中定义的格式一致
    formatDate(date) {
      if (!date) return '';
      
      // 处理字符串类型的日期
      if (typeof date === 'string') {
        // 移除T和Z，格式化为 YYYY-MM-DD HH:MM:SS
        return date.replace('T', ' ').replace('Z', '').replace(/\.\d+$/, '');
      }
      
      // 如果是Date对象
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        const second = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
      
      // 其他情况
      return String(date);
    }
  }
}
</script>

<style scoped>
.product-list {
  margin: 2rem 0;
}

.product-card {
  border: 1px solid #eaecef;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  transition: all 0.3s;
}

.product-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.product-card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #3eaf7c;
}

.product-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.product-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag {
  background-color: #f3f5f7;
  border-radius: 3px;
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
}

.no-products {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.product-versions {
  margin-top: 1rem;
  border-top: 1px dashed #eaecef;
  padding-top: 0.5rem;
}

.product-versions h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.product-versions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.product-versions li {
  margin-bottom: 0.3rem;
  font-size: 0.9rem;
}

.version-date {
  font-size: 0.8rem;
  color: #999;
  margin-left: 0.5rem;
}
</style> 