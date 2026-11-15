@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:4173 in your browser. Press Ctrl+C to stop.
python -m http.server 4173 --bind 127.0.0.1 --directory "%~dp0dist"
