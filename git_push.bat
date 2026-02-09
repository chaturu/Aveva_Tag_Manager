@echo off
rem This script automates the git add, commit, and push process.
echo ------------------------------------------
echo Git Auto Push Script
echo ------------------------------------------

git add .

echo.
set /p msg="Enter commit message: "
if "%msg%"=="" set msg=Auto update

echo.
echo Committing with message: "%msg%"
git commit -m "%msg%"

echo.
echo Pushing to remote repository...
git push

echo.
echo Done!
pause
