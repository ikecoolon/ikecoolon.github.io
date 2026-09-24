<template>
  <div>
    <ul v-if="requirements.length" class="requirement-list">
      <li v-for="item in requirements" :key="item.path">
        <router-link :to="item.path">{{ item.title }}</router-link>
        <small>{{ formatDate(item.date) }}<span v-if="item.surfaces"> · {{ item.surfaces }}</span></small>
      </li>
    </ul>
    <p v-else>暂无需求专题。</p>
  </div>
</template>

<script>
export default {
  name: 'RequirementList',
  computed: {
    requirements() {
      return this.$site.pages
        .filter(page => page.frontmatter.kind === 'requirement')
        .map(page => ({
          title: page.frontmatter.title || page.title,
          date: page.frontmatter.date,
          surfaces: [...new Set((page.frontmatter.prototypeEntries || [])
            .map(entry => entry.surface)
            .filter(Boolean))].join('、'),
          path: page.path
        }))
        .sort((a, b) => this.formatDate(b.date).localeCompare(this.formatDate(a.date)))
    }
  },
  methods: {
    formatDate(date) {
      return date instanceof Date ? date.toISOString().slice(0, 10) : String(date || '').slice(0, 10)
    }
  }
}
</script>

<style scoped>
.requirement-list { list-style: none; padding: 0; }
.requirement-list li { border-bottom: 1px solid #eaecef; padding: 0.8rem 0; }
.requirement-list small { color: #777; display: block; margin-top: 0.2rem; }
</style>
