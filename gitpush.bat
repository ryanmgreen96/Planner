@echo off
set /p commitmsg=Enter commit message: 
if "%commitmsg%"=="" (
  echo Commit message cannot be empty.
  pause
  exit /b 1
)

git add .
git commit -m "%commitmsg%"
git push origin main

echo Push complete.
pause
