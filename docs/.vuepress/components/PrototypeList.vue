<template>
  <div>
    <section v-for="group in groups" :key="group.id" class="prototype-group">
      <h2>{{ group.surface }} · {{ group.capability }}</h2>
      <ul>
        <li v-for="entry in group.entries" :key="entry.path">
          <a :href="$withBase(entry.path)" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a>
        </li>
      </ul>
      <p>相关需求：<router-link v-for="item in group.requirements" :key="item.path" :to="item.path">{{ item.title }}</router-link></p>
    </section>
    <p v-if="!groups.length">暂无已关联需求的原型。</p>
  </div>
</template>

<script>
export default {
  name: 'PrototypeList',
  computed: {
    groups() {
      const groups = new Map()
      this.$site.pages.filter(page => page.frontmatter.kind === 'requirement').forEach(page => {
        const entries = page.frontmatter.prototypeEntries || []
        entries.forEach(entry => {
          const id = `${entry.surface}/${entry.capability}`
          if (!groups.has(id)) {
            groups.set(id, { id, surface: entry.surface, capability: entry.capability, entries: [], requirements: [] })
          }
          const group = groups.get(id)
          if (!group.entries.some(item => item.path === entry.path)) {
            group.entries.push({ title: entry.title, path: entry.path })
          }
          if (!group.requirements.some(item => item.path === page.path)) {
            group.requirements.push({ title: page.frontmatter.title || page.title, path: page.path })
          }
        })
      })
      return Array.from(groups.values())
    }
  }
}
</script>

<style scoped>
.prototype-group { border-bottom: 1px solid #eaecef; padding: 0.4rem 0 1rem; }
.prototype-group h2 { font-size: 1.15rem; }
.prototype-group ul { margin: 0.5rem 0; }
.prototype-group a { font-weight: 600; }
.prototype-group p { color: #666; font-size: 0.9rem; }
.prototype-group p a { margin-left: 0.8rem; }
</style>
