# Android emulator on Windows (Intel/AMD)

## AEHD installer failed (StartService 4294967201)

The **Android Emulator Hypervisor Driver (AEHD)** needs the Windows hypervisor stack. If the SDK installer shows `StartService FAILED`, try in order:

### 1. Run the driver installer as Administrator

In **PowerShell (Admin)**:

```powershell
cd $env:LOCALAPPDATA\Android\Sdk\extras\google\Android_Emulator_Hypervisor_Driver
.\silent_install.bat
```

Or in Android Studio: **Settings → Languages & Frameworks → Android SDK → SDK Tools** → check **Android Emulator hypervisor driver (installer)** → Apply (run Studio as Admin if it keeps failing).

### 2. Enable Windows hypervisor features

**Settings → System → Optional features → More Windows features**, enable:

- **Windows Hypervisor Platform**
- **Virtual Machine Platform** (needed for some setups; can conflict with VirtualBox)

Reboot.

### 3. BIOS

Enable **Intel VT-x** / **AMD-V** (virtualization).

### 4. Core isolation

**Settings → Privacy & security → Windows Security → Device security → Core isolation**

Turn off **Memory integrity** temporarily, reboot, retry AEHD install.

### 5. Conflicts

Other hypervisors (VirtualBox, VMware, old HAXM) can block AEHD. Close them or uninstall old **Intel HAXM** from SDK Tools if you only use AEHD.

---

## Run the emulator without hypervisor (slower but works)

If AEHD cannot be fixed yet:

```powershell
$env:ACCEL_OFF="1"
npm run android:emulator
```

Wait for the home screen, then:

```powershell
npm run android
```

First boot without acceleration can take **10+ minutes**.

---

## Fastest path: physical Android phone

1. Enable **Developer options** and **USB debugging** on the phone.
2. Install [Google USB Driver](https://developer.android.com/studio/run/win-usb) if needed.
3. Connect USB, accept the debugging prompt on the phone.
4. `adb devices` should show `device`.
5. `npm run android` (skips emulator entirely).

---

## This project’s default AVD

Scripts prefer **Pixel_9a (x86_64)** on Intel PCs. Override:

```powershell
$env:ANDROID_AVD="Pixel_9a"
npm run android:emulator
```
