Option Explicit
Dim shell, fs, project, node, server, url, request, ready, attempt, checkOnly
Set shell = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
project = fs.GetParentFolderName(fs.GetParentFolderName(WScript.ScriptFullName))
server = fs.BuildPath(project, "scripts\demo-server.cjs")
node = shell.ExpandEnvironmentStrings("%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
If Not fs.FileExists(node) Then node = "node.exe"
url = "http://127.0.0.1:5502/index.html"
checkOnly = False
If WScript.Arguments.Count > 0 Then checkOnly = (WScript.Arguments(0) = "--check")
If Not fs.FileExists(server) Then
 MsgBox "KICKS project files were not found: " & server, 16, "KICKS Demo"
 WScript.Quit 1
End If
ready = IsReady()
If Not ready Then
 shell.Environment("PROCESS")("KICKS_DEMO_PORT") = "5502"
 shell.CurrentDirectory = project
 On Error Resume Next
 shell.Run Quote(node) & " " & Quote(server), 0, False
 If Err.Number <> 0 Then
  MsgBox "Could not start Node.js. Please check the Node.js installation.", 16, "KICKS Demo"
  WScript.Quit 1
 End If
 On Error GoTo 0
 For attempt = 1 To 40
  WScript.Sleep 250
  ready = IsReady()
  If ready Then Exit For
 Next
End If
If Not ready Then
 MsgBox "KICKS could not start on port 5502. Please check whether another application uses this port.", 16, "KICKS Demo"
 WScript.Quit 1
End If
If checkOnly Then
 WScript.Echo "PASS: KICKS demo is available on port 5502."
Else
 shell.Run url, 1, False
End If
Function Quote(value)
 Quote = Chr(34) & value & Chr(34)
End Function
Function IsReady()
 On Error Resume Next
 Dim probe
 Set probe = CreateObject("WinHttp.WinHttpRequest.5.1")
 probe.SetTimeouts 500, 500, 500, 1000
 probe.Open "GET", url, False
 probe.Send
 IsReady = False
 If Err.Number = 0 Then
  If probe.Status = 200 Then IsReady = (InStr(probe.ResponseText, "Kicks Football") > 0)
 End If
 Err.Clear
 On Error GoTo 0
End Function
