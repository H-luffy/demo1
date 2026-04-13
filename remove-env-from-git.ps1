# 从 Git 历史中删除 .env 文件的 PowerShell 脚本
# 使用方法: .\remove-env-from-git.ps1

Write-Host "开始从 Git 历史中删除 .env 文件..." -ForegroundColor Green

# 检查是否安装了 git-filter-repo
try {
    $null = Get-Command git-filter-repo -ErrorAction Stop
} catch {
    Write-Host "错误: git-filter-repo 未安装" -ForegroundColor Red
    Write-Host "请使用以下命令安装:" -ForegroundColor Yellow
    Write-Host "  pip install git-filter-repo" -ForegroundColor Yellow
    exit 1
}

# 从 Git 历史中删除 backend/.env 文件
git filter-repo --path backend/.env --invert-paths

Write-Host ".env 文件已从 Git 历史中删除" -ForegroundColor Green
Write-Host ""
Write-Host "接下来，请执行以下命令:" -ForegroundColor Yellow
Write-Host "  git push origin --force --all" -ForegroundColor Yellow
Write-Host ""
Write-Host "注意: 强制推送会重写 Git 历史，请确保所有协作者都了解此操作" -ForegroundColor Red
