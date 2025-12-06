; NSIS Installer Script for Craft Automation CPQ
; Includes automatic Visual C++ Runtime installation

!include "MUI2.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; Basic settings
Name "Craft Automation CPQ"
OutFile "${{OUTDIR}}\Craft Automation CPQ Setup.exe"
InstallDir "$PROGRAMFILES64\Craft Automation CPQ"
RequestExecutionLevel admin

; MUI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Version Info
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Craft Automation CPQ"
VIAddVersionKey "CompanyName" "Craft Automation"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0.0"
VIAddVersionKey "FileDescription" "CPQ System for Industrial Automation"

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Check and install Visual C++ Runtime if needed
  Call CheckAndInstallVCRuntime
  
  ; Copy application files (excluding debug logs)
  SetOverwrite on
  File "release\win-unpacked\Craft Automation CPQ.exe"
  File "release\win-unpacked\*.dll"
  File "release\win-unpacked\*.dat"
  File "release\win-unpacked\*.bin"
  SetOutPath "$INSTDIR\locales"
  File /r "release\win-unpacked\locales\*.*"
  SetOutPath "$INSTDIR\resources"
  File /r "release\win-unpacked\resources\*.*"
  SetOutPath "$INSTDIR"
  
  ; Create Start Menu shortcuts
  SetOutPath "$SMPROGRAMS\Craft Automation"
  CreateDirectory "$SMPROGRAMS\Craft Automation"
  CreateShortcut "$SMPROGRAMS\Craft Automation\Craft Automation CPQ.lnk" "$INSTDIR\Craft Automation CPQ.exe"
  CreateShortcut "$SMPROGRAMS\Craft Automation\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Create Desktop shortcut
  CreateShortcut "$DESKTOP\Craft Automation CPQ.lnk" "$INSTDIR\Craft Automation CPQ.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Write registry entries for uninstall
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ" "DisplayName" "Craft Automation CPQ"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ" "Publisher" "Craft Automation"
  
  DetailPrint "Installation complete!"
SectionEnd

Section "Uninstall"
  ; Remove application directory
  RMDir /r "$INSTDIR"
  
  ; Remove Start Menu shortcuts
  RMDir /r "$SMPROGRAMS\Craft Automation"
  
  ; Remove Desktop shortcut
  Delete "$DESKTOP\Craft Automation CPQ.lnk"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CraftAutomationCPQ"
  
  DetailPrint "Uninstallation complete!"
SectionEnd

; Function to check and install Visual C++ Runtime
; Downloads from Microsoft official repository
Function CheckAndInstallVCRuntime
  ; Check if running on 64-bit Windows
  ${If} ${RunningX64}
    ; Check Visual Studio 2015-2022 Runtime installation
    ClearErrors
    ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
    
    ; If VC++ not found
    ${If} ${Errors}
      DetailPrint "Visual C++ 2015-2022 Runtime not detected. Attempting installation..."
      
      ; Create temp directory
      CreateDirectory "$TEMP\CraftSetup"
      SetOutPath "$TEMP\CraftSetup"
      
      ; Download VC++ redistributable using PowerShell
      DetailPrint "Downloading Visual C++ Runtime from Microsoft..."
      ExecShell "open" "powershell.exe" \
        "-NoProfile -ExecutionPolicy Bypass -Command `"& { (New-Object System.Net.WebClient).DownloadFile('https://aka.ms/vs/17/release/vc_redist.x64.exe', '$TEMP\CraftSetup\vc_redist.x64.exe'); Exit `$?}`"" \
        SW_HIDE
      
      Sleep 3000
      
      ; Check if download succeeded
      ${If} ${FileExists} "$TEMP\CraftSetup\vc_redist.x64.exe"
        DetailPrint "Visual C++ Runtime downloaded successfully. Installing..."
        
        ; Run the installer silently
        ExecWait "$TEMP\CraftSetup\vc_redist.x64.exe /quiet /norestart" $1
        
        ${If} $1 = 0
          DetailPrint "Visual C++ Runtime installed successfully!"
        ${Else}
          DetailPrint "Visual C++ installer completed with status: $1"
        ${EndIf}
        
        ; Cleanup
        Delete "$TEMP\CraftSetup\vc_redist.x64.exe"
      ${Else}
        MessageBox MB_OK "Note: Visual C++ Runtime download requires internet connection.$\n$\nIf the application fails to start after installation, please visit:$\nhttps://support.microsoft.com/en-us/help/2977003"
      ${EndIf}
      
      RMDir "$TEMP\CraftSetup"
    ${Else}
      DetailPrint "Visual C++ 2015-2022 Runtime is already installed."
    ${EndIf}
  ${EndIf}
FunctionEnd
