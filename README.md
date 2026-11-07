# PC Mode Manager

**One PC. Different workflows. One click to switch.**

PC Mode Manager is a lightweight Windows desktop application for organizing your PC around the way you use it. Create profiles for gaming, development, work, or your own routines — then launch the apps and scripts you need in a configurable sequence.

Built with **Rust + Tauri 2** and a native-feeling HTML/CSS/Vanilla JavaScript interface.

> **Current release: v1.2.0** · Windows 10/11 · x64

## Why PC Mode Manager?

Switching between gaming, coding, and everyday work often means manually opening and closing the same apps, scripts, and folders. PC Mode Manager brings those repeatable steps together in reusable profiles.

Instead of configuring your desktop every time, choose a profile and let the app run its configured actions.

## Features

- **Mode profiles** — Gaming, Development, Work, and custom profiles.
- **Script and app launcher** — run `.exe`, `.bat`, `.cmd`, and `.ps1` files in sequence.
- **Configurable automation** — set arguments, working directories, delays, and per-action error behavior.
- **Profile management** — create, edit, duplicate, delete, restore defaults, and import/export profiles as JSON.
- **Process manager** — search and sort running processes, inspect PID and memory usage, launch apps, close selected processes, and separately confirm force termination.
- **System monitor** — view CPU and RAM usage, uptime, disk information, and temperature sensors when exposed by the system.
- **Personalization** — Russian and English interface, light and dark themes, compact layout, and animation settings.
- **Windows startup** — optionally launch PC Mode Manager when you sign in.
- **Windows installers** — build NSIS `.exe` and MSI packages locally or through GitHub Actions.

## Screenshots

_Add screenshots or a short demo GIF here._

Suggested screenshots:
- `docs/screenshots/mode-dashboard.png`
- `docs/screenshots/profiles-editor.png`
- `docs/screenshots/process-manager.png`
- `docs/screenshots/system-monitor.png`

## Download

Prebuilt installers are published in the repository's **GitHub Releases** section when a release is created.

If no release is available yet, you can build the installer yourself using the instructions below.

## Build from source

### Requirements

- Windows 10/11 (x64)
- Node.js 22
- Rust stable toolchain (Cargo)
- Microsoft C++ Build Tools
- WebView2 Runtime (normally present on Windows 11)

### Development

Open PowerShell in the project root:

```powershell
npm install
cd src-tauri
cargo test
cd ..
npm run dev
```

### Build Windows installers

Run the included build script:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\build-windows.ps1
```

Or build directly:

```powershell
npm install
cd src-tauri
cargo test
cd ..
npm run build:windows
```

The installers are generated in:

- `src-tauri/target/release/bundle/nsis/`
- `src-tauri/target/release/bundle/msi/`

## Build with GitHub Actions

The repository includes a workflow at `.github/workflows/windows-release.yml`.

1. Push the project to GitHub.
2. Open **Actions → Build Windows installers**.
3. Select **Run workflow** to build installers on a Windows runner.
4. Download the `PC-Mode-Manager-Windows-Installers` artifact after the workflow succeeds.

Pushing a version tag matching `v*` (for example, `v1.2.0`) also starts the workflow.

## Automation behavior and safety

- Actions run in the order configured in the selected profile.
- Supported file types are `.exe`, `.bat`, `.cmd`, and `.ps1`.
- A profile action can be configured to continue or abort when it fails.
- The application does not silently elevate privileges. If an action requires administrator rights, launch PC Mode Manager with the required permissions.
- Force termination is a separate operation and can cause unsaved data loss.
- **Deactivating a mode does not currently stop applications or child processes launched by that mode.** Stop those processes manually in the Process Manager when needed.

## Current limitations

This is an actively evolving project. Please read these limitations before relying on it:

- GPU utilization, GPU temperature, and network throughput are **not implemented in this v1.2.0 archive**.
- Temperature readings depend on sensors and drivers exposed by the PC.
- Process protection uses a conservative denylist; it is not a complete Windows protected-process classifier.
- Appearance settings are stored locally. Profiles are managed separately by the profile backend.
- The source archive is **not** an installer. Build an installer or download one from Releases.

## Tech stack

- **Backend:** Rust, Tauri 2
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES modules)
- **System information:** `sysinfo`
- **Windows integration:** Windows API, Tauri plugins
- **Configuration:** JSON profiles

## Contributing

Issues, bug reports, and pull requests are welcome. When reporting a bug, include:
- Windows version and architecture
- PC Mode Manager version
- Steps to reproduce
- Relevant application logs or terminal output
- Screenshots, if the issue is visual

## License

No license has been selected for this repository yet. Until a license is added, the default copyright rules apply and others do not automatically receive permission to use, modify, or redistribute the code.

---

**PC Mode Manager** — make your PC switch context as fast as you do.
