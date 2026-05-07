Set shell = CreateObject("WScript.Shell")
scriptPath = "C:\Users\ibnra.DESKTOP-A17OJSP\Documents\Codex\2026-05-07\rtl\launch-codex-rtl-local.ps1"
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptPath & """"
shell.Run command, 0, False
