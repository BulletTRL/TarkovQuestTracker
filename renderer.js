const fs = require("fs");
const path = require("path");
const { shell } = require("electron");

const appPath = __dirname;
const questFile = path.join(appPath, "data", "quests.json");
const userDir = path.join(appPath, "user");
const progressFile = path.join(userDir, "progress.json");

// Ensure folders exist
if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
if (!fs.existsSync(progressFile)) {
  fs.writeFileSync(progressFile, JSON.stringify({ completed: [] }, null, 2));
}

let quests = [];
let progress = { completed: [] };

try {
  quests = JSON.parse(fs.readFileSync(questFile, "utf-8"));
  progress = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
} catch (err) {
  console.error("Error loading quest data:", err);
}

const questList = document.getElementById("quest-list");
const progressBar = document.getElementById("progress");
const progressText = document.getElementById("progress-text");
const toggleCompletedBtn = document.getElementById("toggle-completed");
const toggleKappaBtn = document.getElementById("toggle-kappa");

// --- Menu Elements ---
const menuBtn = document.getElementById("menu-btn");
const sideMenu = document.getElementById("side-menu");
const viewQuests = document.getElementById("view-quests");
const viewFlow = document.getElementById("view-flow");
const openWiki = document.getElementById("open-wiki");
const openYouTube = document.getElementById("open-youtube");
const openTwitch = document.getElementById("open-twitch");
const closeSidebar = document.getElementById("close-sidebar"); // ✅ Added

// --- Menu Functionality ---
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sideMenu.classList.toggle("show");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#side-menu") && !e.target.closest("#menu-btn")) {
    sideMenu.classList.remove("show");
  }
});

// ✅ Added close button click
if (closeSidebar) {
  closeSidebar.addEventListener("click", () => {
    sideMenu.classList.remove("show");
  });
}

viewQuests.addEventListener("click", () => {
  document.getElementById("quest-container").style.display = "block";
  document.getElementById("flow-container").style.display = "none";
  sideMenu.classList.remove("show");
});

viewFlow.addEventListener("click", () => {
  document.getElementById("quest-container").style.display = "none";
  document.getElementById("flow-container").style.display = "block";
  sideMenu.classList.remove("show");
});

// --- External Links ---
openWiki?.addEventListener("click", () => {
  shell.openExternal("https://escapefromtarkov.fandom.com/wiki/Escape_from_Tarkov_Wiki");
});
openYouTube?.addEventListener("click", () => {
  shell.openExternal("https://www.youtube.com/@XotiicWC");
});
openTwitch?.addEventListener("click", () => {
  shell.openExternal("https://www.twitch.tv/XotiicWC");
});

// --- Quest Logic ---
let showCompleted = false;
let showKappaOnly = false;

toggleCompletedBtn.textContent = showCompleted ? "Hide Completed" : "Show Completed";
toggleKappaBtn.textContent = showKappaOnly ? "Show All Tasks" : "Show Only Kappa";

toggleCompletedBtn.addEventListener("click", () => {
  showCompleted = !showCompleted;
  toggleCompletedBtn.textContent = showCompleted ? "Hide Completed" : "Show Completed";
  render();
});

toggleKappaBtn.addEventListener("click", () => {
  showKappaOnly = !showKappaOnly;
  toggleKappaBtn.textContent = showKappaOnly ? "Show All Tasks" : "Show Only Kappa";
  render();
});

function saveProgress() {
  fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));
}

function updateProgress(filteredQuests) {
  const total = filteredQuests.length;
  const done = filteredQuests.filter(q => progress.completed.includes(q.id)).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  progressBar.style.width = pct + "%";
  progressText.textContent = `${done} / ${total} completed`;
}

function markQuestComplete(id) {
  if (progress.completed.includes(id)) {
    progress.completed = progress.completed.filter((x) => x !== id);
  } else {
    progress.completed.push(id);
  }
  saveProgress();
  render();
}

function toggleQuestDetails(detailsEl) {
  const currentlyOpen = !detailsEl.classList.contains("hidden");
  document.querySelectorAll(".quest-details").forEach((el) => el.classList.add("hidden"));
  if (!currentlyOpen) detailsEl.classList.remove("hidden");
}

function render() {
  questList.innerHTML = "";

  const filtered = quests.filter(q => showKappaOnly ? q.kappa_required : true);

  const traders = {};
  filtered.forEach(q => {
    if (!traders[q.trader]) traders[q.trader] = [];
    traders[q.trader].push(q);
  });

  Object.keys(traders).forEach(trader => {
    const section = document.createElement("div");
    const header = document.createElement("h2");
    header.textContent = trader;
    section.appendChild(header);

    traders[trader].forEach(q => {
      const isDone = progress.completed.includes(q.id);
      if (!showCompleted && isDone) return;

      const quest = document.createElement("div");
      quest.className = "quest";

      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.alignItems = "center";

      const title = document.createElement("span");
      if (q.kappa_required) {
        const symbol = document.createElement("span");
        symbol.textContent = "◆ ";
        symbol.style.color = "#3bb273";
        symbol.style.marginRight = "4px";
        title.appendChild(symbol);
      }

      const nameText = document.createElement("span");
      nameText.textContent = q.name;
      nameText.style.color = isDone ? "#777" : "#eee";
      nameText.style.fontWeight = "600";
      title.appendChild(nameText);

      const statusBtn = document.createElement("button");
      statusBtn.className = "small-btn";
      statusBtn.textContent = isDone ? "Undo" : "Mark Done";
      statusBtn.style.fontSize = "0.75rem";
      statusBtn.style.padding = "3px 8px";
      statusBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        markQuestComplete(q.id);
      });

      top.appendChild(title);
      top.appendChild(statusBtn);
      quest.appendChild(top);

      const details = document.createElement("div");
      details.className = "quest-details hidden";
      details.style.marginTop = "8px";
      details.style.padding = "12px";
      details.style.background = "#191919";
      details.style.borderRadius = "6px";

      if (q.map || q.level_required) {
        const infoRow = document.createElement("div");
        infoRow.style.display = "flex";
        infoRow.style.justifyContent = "space-between";
        infoRow.style.alignItems = "center";
        infoRow.style.marginBottom = "8px";

        const mapText = document.createElement("span");
        mapText.textContent = q.map ? `Map: ${q.map}` : "";
        mapText.style.color = "#ccc";
        mapText.style.fontSize = "0.95rem";
        mapText.style.fontWeight = "600";

        const lvlText = document.createElement("span");
        lvlText.textContent = q.level_required ? `Level ${q.level_required}+` : "";
        lvlText.style.color = "#999";
        lvlText.style.fontSize = "0.9rem";

        infoRow.appendChild(mapText);
        infoRow.appendChild(lvlText);
        details.appendChild(infoRow);

        const divider = document.createElement("hr");
        divider.style.border = "none";
        divider.style.height = "1px";
        divider.style.background = "#2a2a2a";
        divider.style.margin = "6px 0 16px";
        details.appendChild(divider);
      }

      if (q.description) {
        const descTitle = document.createElement("p");
        descTitle.textContent = "Description:";
        descTitle.style.margin = "0 0 6px";
        descTitle.style.fontWeight = "600";
        details.appendChild(descTitle);

        const desc = document.createElement("p");
        desc.textContent = q.description;
        desc.style.margin = "0 0 16px";
        desc.style.color = "#bbb";
        details.appendChild(desc);
      }

      if (q.objectives && q.objectives.length > 0) {
        const objTitle = document.createElement("p");
        objTitle.textContent = "Objectives:";
        objTitle.style.margin = "0 0 6px";
        objTitle.style.fontWeight = "600";
        details.appendChild(objTitle);

        const list = document.createElement("ul");
        list.style.margin = "0 0 16px 20px";
        list.style.padding = "0";
        list.style.color = "#bbb";
        q.objectives.forEach(obj => {
          const li = document.createElement("li");
          li.textContent = obj;
          li.style.marginBottom = "3px";
          list.appendChild(li);
        });
        details.appendChild(list);
      }

      if (q.rewards) {
        const rewardsContainer = document.createElement("div");
        rewardsContainer.style.marginBottom = "16px";

        const title = document.createElement("p");
        title.textContent = "Rewards:";
        title.style.fontWeight = "600";
        title.style.margin = "0 0 6px";
        rewardsContainer.appendChild(title);

        const coreParts = [];
        if (q.rewards.exp) coreParts.push(`${q.rewards.exp.toLocaleString()} EXP`);
        if (q.rewards.roubles) coreParts.push(`${q.rewards.roubles.toLocaleString()}₽`);
        if (q.rewards.usd) coreParts.push(`${q.rewards.usd.toLocaleString()}$`);
        if (q.rewards.eur) coreParts.push(`${q.rewards.eur.toLocaleString()}€`);

        const reps = [];
        if (q.rewards.prapor_rep) reps.push(`Prapor Rep ${q.rewards.prapor_rep > 0 ? "+" : ""}${q.rewards.prapor_rep}`);
        if (q.rewards.skier_rep) reps.push(`Skier Rep ${q.rewards.skier_rep > 0 ? "+" : ""}${q.rewards.skier_rep}`);
        if (q.rewards.therapist_rep) reps.push(`Therapist Rep ${q.rewards.therapist_rep > 0 ? "+" : ""}${q.rewards.therapist_rep}`);
        if (q.rewards.fence_rep) reps.push(`Fence Rep ${q.rewards.fence_rep > 0 ? "+" : ""}${q.rewards.fence_rep}`);
        if (q.rewards.peacekeeper_rep) reps.push(`Peacekeeper Rep ${q.rewards.peacekeeper_rep > 0 ? "+" : ""}${q.rewards.peacekeeper_rep}`);
        if (q.rewards.mechanic_rep) reps.push(`Mechanic Rep ${q.rewards.mechanic_rep > 0 ? "+" : ""}${q.rewards.mechanic_rep}`);
        if (q.rewards.jaeger_rep) reps.push(`Jaeger Rep ${q.rewards.jaeger_rep > 0 ? "+" : ""}${q.rewards.jaeger_rep}`);

        if (reps.length > 0) coreParts.push(reps.join(" | "));

        if (coreParts.length > 0) {
          const coreLine = document.createElement("p");
          coreLine.textContent = coreParts.join(" | ");
          coreLine.style.margin = "0 0 8px";
          coreLine.style.color = "#bbb";
          coreLine.style.fontSize = "0.9rem";
          rewardsContainer.appendChild(coreLine);
        }

        if (Array.isArray(q.rewards.items) && q.rewards.items.length > 0) {
          const itemList = document.createElement("ul");
          itemList.style.margin = "0 0 10px 20px";
          itemList.style.padding = "0";
          itemList.style.color = "#bbb";
          itemList.style.listStyleType = "disc";
          q.rewards.items.forEach(item => {
            const li = document.createElement("li");
            const hasQuantity = /^[0-9xX]/.test(item.trim());
            li.textContent = hasQuantity ? item : `1× ${item}`;
            itemList.appendChild(li);
          });
          rewardsContainer.appendChild(itemList);
        }

        if (q.rewards.achievement) {
          const achText = document.createElement("p");
          achText.textContent = `Unlocks Achievement: ${q.rewards.achievement}`;
          achText.style.margin = "0";
          achText.style.fontSize = "0.9rem";
          achText.style.color = "#bbb";
          achText.style.fontStyle = "italic";
          rewardsContainer.appendChild(achText);
        }

        details.appendChild(rewardsContainer);
      }

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";

      if (q.wiki_link) {
        const wikiBtn = document.createElement("button");
        wikiBtn.textContent = "View on Wiki";
        wikiBtn.className = "small-btn";
        wikiBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          shell.openExternal(q.wiki_link);
        });
        btnRow.appendChild(wikiBtn);
      }

      const completeBtn = document.createElement("button");
      completeBtn.textContent = isDone ? "Mark Incomplete" : "Mark Completed";
      completeBtn.className = "small-btn";
      completeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        markQuestComplete(q.id);
      });
      btnRow.appendChild(completeBtn);
      details.appendChild(btnRow);

      quest.appendChild(details);
      details.classList.add("hidden");

      quest.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        e.stopPropagation();
        toggleQuestDetails(details);
      });

      section.appendChild(quest);
    });

    questList.appendChild(section);
  });

  updateProgress(filtered);
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".quest")) {
    document.querySelectorAll(".quest-details").forEach((el) => el.classList.add("hidden"));
  }
});

render();
