#!/usr/bin/env sh

# 构建并发布 VuePress 文档站点
# 输出目录: docs/.vuepress/dist
set -e

echo "开始构建..."
npm run docs:build

cd docs/.vuepress/dist

if [ ! -d ".git" ]; then
  git init
  git branch -M main
fi

git add -A

if git diff --staged --quiet; then
  echo "没有变更需要部署"
  cd -
  exit 0
fi

git commit -m 'deploy docs'

echo "推送到 GitHub Pages..."
git push -f https://github.com/ikecoolon/ikecoolon.github.io.git main

cd -

echo "文档站点部署完成！"
