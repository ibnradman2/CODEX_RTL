Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktop = shell.SpecialFolders("Desktop")
shortcutPath = fso.BuildPath(desktop, "Codex RTL.lnk")
launcherPath = fso.BuildPath(scriptDir, "launch-codex-rtl-local.vbs")
iconPath = fso.BuildPath(scriptDir, "_codex_rtl_app\app\resources\icon.ico")
Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
shortcut.Arguments = """" & launcherPath & """"
shortcut.WorkingDirectory = scriptDir
shortcut.IconLocation = iconPath
shortcut.Description = "Open Codex with Arabic RTL direction"
shortcut.Save
