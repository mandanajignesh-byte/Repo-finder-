# Monitor Flutter Build Until Success
Write-Host "🚀 Starting Flutter Build Monitor..." -ForegroundColor Cyan
Write-Host ""

$maxAttempts = 5
$attempt = 1
$success = $false

while ($attempt -le $maxAttempts -and -not $success) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Attempt $attempt of $maxAttempts" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    
    # Run Flutter build
    $process = Start-Process -FilePath "C:\src\flutter\flutter\bin\flutter.bat" -ArgumentList "run" -WorkingDirectory "C:\Users\manda\github\RepoFinderMobile" -NoNewWindow -PassThru -Wait
    
    if ($process.ExitCode -eq 0) {
        Write-Host ""
        Write-Host "✅✅✅ BUILD SUCCESSFUL! ✅✅✅" -ForegroundColor Green
        Write-Host "App is now running on your device!" -ForegroundColor Green
        $success = $true
    } else {
        Write-Host ""
        Write-Host "❌ Build failed with exit code: $($process.ExitCode)" -ForegroundColor Red
        Write-Host "Checking for compilation errors..." -ForegroundColor Yellow
        
        # Check for common errors
        $errors = Get-Content "C:\Users\manda\github\RepoFinderMobile\lib\services\repo_service.dart" | Select-String -Pattern "\.in\("
        if ($errors) {
            Write-Host "⚠️  Found .in() calls that need to be changed to .inFilter()" -ForegroundColor Yellow
        }
        
        $attempt++
        if ($attempt -le $maxAttempts) {
            Write-Host "Waiting 3 seconds before retry..." -ForegroundColor Gray
            Start-Sleep -Seconds 3
        }
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "❌ Build failed after $maxAttempts attempts" -ForegroundColor Red
    Write-Host "Please check the errors above and fix them manually." -ForegroundColor Yellow
}
