#!/bin/bash
# GitHub Pages 部署脚本
set -e

echo "📦 构建项目中..."
npm run build

echo "🚀 部署到 GitHub Pages..."
cd dist
git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
git push -f git@github.com:qqdg1995-sketch/faker-de-jizhang.git gh-pages

echo "✅ 部署完成！"
echo "🔗 访问地址: https://qqdg1995-sketch.github.io/faker-de-jizhang/"
