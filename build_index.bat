@echo off
REM Rebuild index.html from the Excel workbook and the files in src\.
REM Double-click this file after editing src\page.html, src\wheel.css, src\settings.js,
REM src\wheel.js or data\RGC_wheel_source_data.xlsx (close the workbook in Excel first).
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py -3
%PY% scripts\prep.py || goto :error
%PY% scripts\build.py || goto :error
echo.
echo Done. index.html is up to date. Open it in your browser to check, then upload it to GitHub.
pause
exit /b 0
:error
echo.
echo Something went wrong: read the message above. Is Python installed (python.org) and were the
echo packages installed once with:  pip install -r requirements.txt ?
pause
exit /b 1
