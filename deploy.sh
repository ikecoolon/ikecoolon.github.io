#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
echo "开始构建..."
npm run docs:build

# 进入生成的文件夹
cd docs/.vuepress/dist

# 初始化git仓库（如果还没有的话）
if [ ! -d ".git" ]; then
    git init
    git branch -M main
fi

# 添加所有文件
git add -A

# 检查是否有变更需要提交
if git diff --staged --quiet; then
    echo "没有变更需要部署"
    cd -
    exit 0
fi

# 提交变更
git commit -m 'deploy'

# 推送到GitHub Pages
echo "推送到GitHub Pages..."
git push -f git@github.com:ikecoolon/ikecoolon.github.io.git main

cd -

echo "部署完成！"