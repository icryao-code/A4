@echo off
setlocal
cd /d "%~dp0.."
set "NEXT_TEST_WASM_DIR=%CD%\node_modules\@next\swc-wasm-nodejs"
call npm run build
if errorlevel 1 exit /b %errorlevel%
call npm run start
