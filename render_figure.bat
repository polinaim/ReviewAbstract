@echo off
REM Re-export the graphical abstract (PNG/TIFF at 600 dpi and PDF) into figure\ from index.html.
REM First time only:  pip install -r requirements.txt   then   python -m playwright install chromium
cd /d "%~dp0"
set PY=python
where python >nul 2>nul || set PY=py -3
%PY% scripts\render_graphical_abstract.py || goto :error
echo.
echo Done. The figure files are in the figure folder.
pause
exit /b 0
:error
echo.
echo Something went wrong: read the message above.
pause
exit /b 1
