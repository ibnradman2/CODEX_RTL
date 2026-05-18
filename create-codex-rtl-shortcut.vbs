Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
currentPath = fso.BuildPath(scriptDir, "_codex_rtl_current.txt")
localRootName = "_codex_rtl_app"
If fso.FileExists(currentPath) Then
  Set currentFile = fso.OpenTextFile(currentPath, 1)
  localRootName = Trim(currentFile.ReadLine)
  currentFile.Close
End If

If InStr(localRootName, ":\") > 0 Then
  localRoot = localRootName
Else
  localRoot = fso.BuildPath(scriptDir, localRootName)
End If

desktop = shell.SpecialFolders("Desktop")
shortcutPath = fso.BuildPath(desktop, "Codex RTL.lnk")
launcherPath = fso.BuildPath(scriptDir, "launch-codex-rtl-local.vbs")
iconPath = fso.BuildPath(localRoot, "app\resources\icon.ico")
Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = fso.BuildPath(shell.ExpandEnvironmentStrings("%SystemRoot%"), "System32\wscript.exe")
shortcut.Arguments = """" & launcherPath & """"
shortcut.WorkingDirectory = scriptDir
shortcut.IconLocation = iconPath
shortcut.Description = "Open Codex with Arabic RTL direction"
shortcut.Save
