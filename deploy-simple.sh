#!/usr/bin/env sh

# 直接发布 HTML 原型（无需 VuePress 构建）
# 源目录: docs/.vuepress/public/prototype
set -e

cd docs/.vuepress/public/prototype

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

git commit -m '发布宠物健康报告原型'

echo "推送到 GitHub Pages..."
git push -f https://github.com/ikecoolon/ikecoolon.github.io.git main

cd -

echo "原型部署完成！"
