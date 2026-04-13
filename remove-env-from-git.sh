#!/bin/bash

# 从 Git 历史中删除 .env 文件的脚本
# 使用方法: bash remove-env-from-git.sh

echo "开始从 Git 历史中删除 .env 文件..."

# 检查是否安装了 git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
    echo "错误: git-filter-repo 未安装"
    echo "请使用以下命令安装:"
    echo "  pip install git-filter-repo"
    exit 1
fi

# 从 Git 历史中删除 backend/.env 文件
git filter-repo --path backend/.env --invert-paths

echo ".env 文件已从 Git 历史中删除"
echo ""
echo "接下来，请执行以下命令:"
echo "  git push origin --force --all"
echo ""
echo "注意: 强制推送会重写 Git 历史，请确保所有协作者都了解此操作"
