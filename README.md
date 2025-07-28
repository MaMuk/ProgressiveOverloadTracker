
# Progressive Overload Tracker

This is a Cordova-based hybrid app for tracking exercise history.

---

## Project Structure

This repository contains only the `www` folder with the core web app files:

- `www/index.html`
- `www/js/index.js`
- `www/img/*` (images)

---

## Getting Started: Setting up the Cordova Project

To run and build this app, you need to create a Cordova project, add platforms, then copy these files into the `www` folder.

---

### Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)
- [Cordova CLI](https://cordova.apache.org/) installed globally:

```bash
npm install -g cordova
```

- Android SDK & Java JDK installed and configured (for Android builds)
- (Optional) A browser to test the browser platform

---

### Setup Instructions

1. **Create a new Cordova project**

```bash
cordova create progressive-overload com.example.progressiveoverload ProgressiveOverloadTracker
cd progressive-overload
```

2. **Add platforms**

```bash
cordova platform add android
cordova platform add browser
```

3. **Add required Cordova plugins**

```bash
cordova plugin add cordova-plugin-file
cordova plugin add cordova-plugin-android-permissions
```

4. **Replace the default `www` folder with the repository files**

Copy the `www` folder from this repo into your new project, overwriting the default:

```bash
rm -rf www
cp -r /path/to/repo/www .
```

5. **Build the project**

For Android:

```bash
cordova build android
```

To test in the browser:

```bash
cordova run browser
```

---

## License

[MIT License](LICENSE)
