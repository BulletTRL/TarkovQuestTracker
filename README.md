# Tarkov Quest Tracker 🎯
A local desktop application built with **Electron** to help players track and organize their Escape from Tarkov quests — including progress toward the **Kappa Container**.

---

## 🚀 Features
- ✅ **Quest Progress Tracking** — mark quests as complete, view progress bar, and toggle Kappa-only or completed-only quests  
- 📜 **Quest Details Panel** — view objectives, rewards, and links to official Tarkov Wiki pages  
- 🧭 **Quest Tree View (Coming Soon)** — visualize quest dependencies and progression order  
- ⚙️ **Local Save System** — progress and preferences are saved automatically on your computer  
- 💾 **Offline & Local** — no internet or online login required  

---

## 🧩 Project Structure
```
TarkovQuestTracker/
│
├── data/
│   └── quests.json         # All Tarkov quests with metadata and structure
│
├── user/
│   └── progress.json       # Your local quest completion data (auto-created)
│
├── main.js                 # Electron main process (app entry)
├── renderer.js             # Handles UI logic and quest rendering
├── index.html              # Core application interface
├── package.json            # Project configuration and dependencies
└── .gitignore              # Prevents unnecessary files from being pushed (node_modules, dist, etc.)
```

---

## 🛠️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/BulletTRL/TarkovQuestTracker.git
cd TarkovQuestTracker
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Run the app
```bash
npm start
```

The app will launch in an Electron window — all quest progress is saved automatically.

---

## ⚡ Tech Stack
- [Electron](https://www.electronjs.org/) – Desktop runtime for Node + Chromium  
- [Node.js](https://nodejs.org/) – Backend scripting and local file system management  
- [HTML/CSS/JS] – UI framework  
- Local JSON files for persistent offline storage  

---

## 🧠 Notes
- All progress is stored locally — nothing is uploaded online.  
- `node_modules/` is excluded from the repository; run `npm install` before launching.  
- Works on **Windows**, **Mac**, and **Linux** (with small path tweaks).  

---

## 📺 Creator
Developed by **BulletTRL**  
- [YouTube](https://www.youtube.com/@BulletTRL)  
- [Twitch](https://www.twitch.tv/BulletTRL)  

---

## 🧱 Future Plans
- Quest dependency **flowchart view**
- Search/filter system by map or trader
- Cross-save sync support between machines
