# .env 文件泄露处理指南

## 问题描述

`.env` 文件包含敏感信息（如 API 密钥、数据库凭证等），不应该被提交到 Git 仓库。如果 `.env` 文件已经被提交到 GitHub，需要采取以下步骤来处理。

## 立即采取的行动

### 1. 撤销/更改泄露的密钥

登录相关服务提供商的控制台，撤销或更改以下密钥：
- Supabase: `SUPABASE_ANON_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY`
- 通义千问: `QWEN_API_KEY`
- 任何其他 API 密钥或凭证

### 2. 从 Git 历史中删除 .env 文件

由于 `.env` 文件已经提交到 Git，仅从当前工作目录删除是不够的，因为它仍然存在于 Git 历史中。

#### 方法一：使用提供的脚本（推荐）

Windows 用户可以使用 PowerShell 脚本：

```powershell
# 首先安装 git-filter-repo
pip install git-filter-repo

# 运行脚本
.\remove-env-from-git.ps1

# 强制推送到远程仓库
git push origin --force --all
```

Linux/Mac 用户可以使用 Bash 脚本：

```bash
# 首先安装 git-filter-repo
pip install git-filter-repo

# 运行脚本
bash remove-env-from-git.sh

# 强制推送到远程仓库
git push origin --force --all
```

#### 方法二：手动执行命令

```bash
# 安装 git-filter-repo
pip install git-filter-repo

# 从 Git 历史中删除 backend/.env 文件
git filter-repo --path backend/.env --invert-paths

# 强制推送到远程仓库
git push origin --force --all
```

### 3. 从当前工作目录删除 .env 文件（但不删除实际文件）

```bash
git rm --cached backend/.env
git commit -m "Remove .env from git tracking"
```

### 4. 确保 .gitignore 包含正确的规则

项目根目录的 `.gitignore` 文件应该包含以下规则：

```gitignore
# 环境配置文件
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

## 预防措施

### 1. 使用 .env.example 文件

项目应该包含一个 `.env.example` 文件，作为环境变量的模板，不包含实际密钥。其他开发者可以复制此文件并填入自己的值：

```bash
cp backend/.env.example backend/.env
```

### 2. 使用 pre-commit 钩子

可以设置 Git pre-commit 钩子，防止意外提交 `.env` 文件：

```bash
# 在 .git/hooks/pre-commit 文件中添加以下内容
#!/bin/sh
if git diff --cached --name-only | grep -q "\.env$"; then
    echo "错误: 尝试提交 .env 文件！"
    echo "请将 .env 添加到 .gitignore 或使用 git rm --cached <file> 取消跟踪。"
    exit 1
fi
```

### 3. 定期检查仓库中的敏感信息

可以使用工具如 `git-secrets` 或 `truffleHog` 来扫描仓库中的敏感信息：

```bash
# 安装 truffleHog
pip install truffleHog

# 扫描仓库
trufflehog --regex --entropy=False /path/to/repo
```

## 注意事项

1. **强制推送会重写 Git 历史**，这可能会导致其他协作者的问题。确保所有协作者都了解此操作，并在操作前进行沟通。

2. **即使从 Git 历史中删除了 .env 文件**，如果有人已经克隆了仓库，他们仍然可以访问历史记录中的敏感信息。因此，**更改所有泄露的密钥是最重要的步骤**。

3. **考虑使用 GitHub Secret Scanning**：GitHub 提供了秘密扫描功能，可以自动检测仓库中的敏感信息。确保此功能已启用。

4. **私有仓库也需要注意**：即使仓库是私有的，也应该避免提交敏感信息，因为访问权限可能会随时间改变。

## 总结

处理 .env 文件泄露的关键步骤：
1. 立即撤销/更改所有泄露的密钥
2. 从 Git 历史中删除 .env 文件
3. 从当前工作目录取消跟踪 .env 文件
4. 确保 .gitignore 包含正确的规则
5. 采取预防措施，防止未来再次发生
