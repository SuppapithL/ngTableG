$files = Get-ChildItem -Path . -Filter "*.go" -Recurse
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName
    $newContent = $content -replace 'github\.com/tonk/pkeng-tableg', 'github.com/kengtableg/pkeng-tableg'
    Set-Content -Path $file.FullName -Value $newContent
}
Write-Host "Updated imports in all .go files" 