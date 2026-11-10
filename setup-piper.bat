@echo off
setlocal
cd /d "%~dp0"

set PIPER_URL=https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip
set VOICE=en_US-lessac-medium
set VOICE_URL=https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium

if not exist tools mkdir tools
if not exist tools\voices mkdir tools\voices

if exist tools\piper\piper.exe goto have_piper
echo Downloading Piper...
curl.exe -L --fail -o tools\piper.zip %PIPER_URL%
if errorlevel 1 goto error
echo Extracting Piper...
tar -xf tools\piper.zip -C tools
if errorlevel 1 goto error
del tools\piper.zip
:have_piper

if not exist tools\piper\piper.exe (
  echo piper.exe was not found after extraction.
  goto error
)

if exist tools\voices\%VOICE%.onnx goto have_voice
echo Downloading voice %VOICE% - about 60 MB...
curl.exe -L --fail -o tools\voices\%VOICE%.onnx %VOICE_URL%/%VOICE%.onnx
if errorlevel 1 goto error
curl.exe -L --fail -o tools\voices\%VOICE%.onnx.json %VOICE_URL%/%VOICE%.onnx.json
if errorlevel 1 goto error
:have_voice

for %%F in (tools\voices\%VOICE%.onnx) do set VSIZE=%%~zF
if %VSIZE% LSS 10000000 goto badvoice
if not exist tools\voices\%VOICE%.onnx.json goto badvoice

echo.
echo Files verified:
echo   tools\piper\piper.exe
echo   tools\voices\%VOICE%.onnx
echo   tools\voices\%VOICE%.onnx.json
echo.
echo Next: node scripts\test-tts.mjs
exit /b 0

:badvoice
echo The voice download is incomplete. Deleting it; run this file again.
del tools\voices\%VOICE%.onnx >nul 2>&1
del tools\voices\%VOICE%.onnx.json >nul 2>&1
exit /b 1

:error
echo.
echo Download or extraction failed. Check your internet connection and run this file again.
exit /b 1