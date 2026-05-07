Set shell = CreateObject("WScript.Shell")
desktop = shell.SpecialFolders("Desktop")
shortcutPath = desktop & "\Codex RTL.lnk"
Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
shortcut.Arguments = """C:\Users\ibnra.DESKTOP-A17OJSP\Documents\Codex\2026-05-07\rtl\launch-codex-rtl-local.vbs"""
shortcut.WorkingDirectory = "C:\Users\ibnra.DESKTOP-A17OJSP\Documents\Codex\2026-05-07\rtl"
shortcut.IconLocation = "C:\Users\ibnra.DESKTOP-A17OJSP\Documents\Codex\2026-05-07\rtl\_codex_rtl_app_v9\app\resources\icon.ico"
shortcut.Description = "Open Codex with Arabic RTL direction"
shortcut.Save
