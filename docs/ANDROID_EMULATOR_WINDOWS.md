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

## Run the emulator without hypervisor (often does not work)

On recent **x86_64** system images (API 30+), the emulator usually still needs **VT-x / AMD-V enabled in BIOS** and AEHD. Software-only mode (`-accel off`) may start briefly, then **crash** (`qemu-system-x86_64.exe`, `EXCEPTION_ACCESS_VIOLATION`) — see `android/emulator-last.log`.

If AEHD cannot be fixed yet, you can try (no guarantee):

```powershell
$env:ACCEL_OFF="1"
npm run android:emulator
```

If the emulator window stays open and reaches the home screen:

```powershell
npm run android
```

Without firmware virtualization, prefer a **physical phone** (below) instead of fighting the emulator.

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
