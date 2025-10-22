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
const questContainer = document.getElementById("quest-container");
const flowContainer = document.getElementById("flow-container");
const questTreeCanvas = document.getElementById("quest-tree-canvas");

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
  questContainer.style.display = "block";
  flowContainer.style.display = "none";
  sideMenu.classList.remove("show");
});

viewFlow.addEventListener("click", () => {
  questContainer.style.display = "none";
  flowContainer.style.display = "block";
  renderQuestTree();
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

const SVG_NS = "http://www.w3.org/2000/svg";

function normalizeToArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

function buildQuestGraphData(allQuests) {
  const questMap = new Map(allQuests.map((quest) => [quest.id, quest]));
  const nodes = allQuests.map((quest) => ({
    id: quest.id,
    name: quest.name,
    trader: quest.trader || "Unknown",
    kappa: Boolean(quest.kappa_required),
  }));

  const edges = [];
  const dedupe = new Set();

  allQuests.forEach((quest) => {
    normalizeToArray(quest.requires).forEach((reqId) => {
      if (!questMap.has(reqId) || reqId === quest.id) return;
      const key = `${reqId}->${quest.id}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      edges.push({ from: reqId, to: quest.id, type: "requires" });
    });

    normalizeToArray(quest.unlocks).forEach((unlockId) => {
      if (!questMap.has(unlockId) || unlockId === quest.id) return;
      const key = `${quest.id}->${unlockId}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      edges.push({ from: quest.id, to: unlockId, type: "unlocks" });
    });
  });

  return { nodes, edges };
}

function computeQuestLevels(nodes, edges) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map();

  edges.forEach((edge) => {
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to) || edge.from === edge.to) return;
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  });

  const queue = [];
  indegree.forEach((value, id) => {
    if (value === 0) {
      queue.push(id);
    }
  });

  const level = new Map();
  queue.forEach((id) => level.set(id, 0));

  while (queue.length > 0) {
    const current = queue.shift();
    const currentLevel = level.get(current) || 0;
    (adjacency.get(current) || []).forEach((target) => {
      const proposed = currentLevel + 1;
      const existing = level.get(target);
      if (existing === undefined || proposed > existing) {
        level.set(target, proposed);
      }

      const nextDegree = (indegree.get(target) || 0) - 1;
      indegree.set(target, nextDegree);
      if (nextDegree <= 0) {
        queue.push(target);
      }
    });
  }

  nodes.forEach((node) => {
    if (!level.has(node.id)) {
      level.set(node.id, 0);
    }
  });

  return level;
}

function renderQuestTree() {
  if (!questTreeCanvas) return;

  while (questTreeCanvas.firstChild) {
    questTreeCanvas.removeChild(questTreeCanvas.firstChild);
  }

  const { nodes, edges } = buildQuestGraphData(quests);

  if (nodes.length === 0) {
    questTreeCanvas.setAttribute("width", "400");
    questTreeCanvas.setAttribute("height", "200");
    questTreeCanvas.style.width = "400px";
    questTreeCanvas.style.height = "200px";
    const emptyText = document.createElementNS(SVG_NS, "text");
    emptyText.setAttribute("x", "20");
    emptyText.setAttribute("y", "40");
    emptyText.setAttribute("fill", "#888");
    emptyText.textContent = "No quests available to visualize.";
    questTreeCanvas.appendChild(emptyText);
    return;
  }

  const levelMap = computeQuestLevels(nodes, edges);
  const levelGroups = new Map();

  nodes.forEach((node) => {
    const lvl = levelMap.get(node.id) || 0;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    levelGroups.get(lvl).push(node);
  });

  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);
  levelGroups.forEach((group) => {
    group.sort((a, b) => {
      const traderComparison = (a.trader || "").localeCompare(b.trader || "");
      if (traderComparison !== 0) return traderComparison;
      return (a.name || "").localeCompare(b.name || "");
    });
  });

  const columnCount = Math.max(sortedLevels.length, 1);
  const maxPerColumn = Math.max(
    1,
    ...sortedLevels.map((lvl) => levelGroups.get(lvl).length)
  );

  const padding = 40;
  const nodeWidth = 180;
  const nodeHeight = 70;
  const horizontalGap = 90;
  const verticalGap = 60;
  const columnSpacing = nodeWidth + horizontalGap;
  const rowSpacing = nodeHeight + verticalGap;

  const totalWidth = padding * 2 + (columnCount - 1) * columnSpacing + nodeWidth;
  const totalHeight = padding * 2 + (maxPerColumn - 1) * rowSpacing + nodeHeight;

  questTreeCanvas.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
  questTreeCanvas.setAttribute("width", totalWidth);
  questTreeCanvas.setAttribute("height", totalHeight);
  questTreeCanvas.style.width = `${totalWidth}px`;
  questTreeCanvas.style.height = `${totalHeight}px`;

  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "quest-tree-arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");

  const markerPath = document.createElementNS(SVG_NS, "path");
  markerPath.setAttribute("d", "M0,0 L0,6 L9,3 z");
  markerPath.setAttribute("fill", "#3bb273");
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  questTreeCanvas.appendChild(defs);

  const levelColumnIndex = new Map(sortedLevels.map((lvl, idx) => [lvl, idx]));
  const nodePositions = new Map();

  sortedLevels.forEach((lvl) => {
    const columnIndex = levelColumnIndex.get(lvl);
    const nodesInLevel = levelGroups.get(lvl);
    const startY = padding + ((maxPerColumn - nodesInLevel.length) * rowSpacing) / 2;
    nodesInLevel.forEach((node, index) => {
      const x = padding + columnIndex * columnSpacing;
      const y = startY + index * rowSpacing;
      nodePositions.set(node.id, { x, y });
    });
  });

  const edgeGroup = document.createElementNS(SVG_NS, "g");
  edgeGroup.setAttribute("class", "tree-links");

  const incomingCounts = new Map(nodes.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) || 0) + 1);
  });

  edges.forEach((edge) => {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    if (!fromPos || !toPos) return;

    const startX = fromPos.x + nodeWidth;
    const startY = fromPos.y + nodeHeight / 2;
    const endX = toPos.x;
    const endY = toPos.y + nodeHeight / 2;
    const direction = endX >= startX ? 1 : -1;
    const control = Math.max(60, Math.abs(endX - startX) / 2);
    const c1x = startX + control * direction;
    const c2x = endX - control * direction;

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute(
      "d",
      `M ${startX} ${startY} C ${c1x} ${startY}, ${c2x} ${endY}, ${endX} ${endY}`
    );
    path.setAttribute("class", `tree-link ${edge.type}`);
    path.setAttribute("marker-end", "url(#quest-tree-arrow)");
    edgeGroup.appendChild(path);
  });

  questTreeCanvas.appendChild(edgeGroup);

  const nodeGroup = document.createElementNS(SVG_NS, "g");

  nodes.forEach((node) => {
    const position = nodePositions.get(node.id);
    if (!position) return;

    const isCompleted = progress.completed.includes(node.id);
    const nodeContainer = document.createElementNS(SVG_NS, "g");
    nodeContainer.setAttribute("transform", `translate(${position.x}, ${position.y})`);
    nodeContainer.classList.add("tree-node");
    nodeContainer.classList.add(isCompleted ? "completed" : "pending");
    if (node.kappa) nodeContainer.classList.add("kappa");

    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("width", nodeWidth);
    rect.setAttribute("height", nodeHeight);
    rect.setAttribute("rx", "12");
    rect.setAttribute("ry", "12");
    nodeContainer.appendChild(rect);

    const nameText = document.createElementNS(SVG_NS, "text");
    nameText.setAttribute("x", nodeWidth / 2);
    nameText.setAttribute("y", 28);
    nameText.setAttribute("text-anchor", "middle");
    nameText.textContent = node.name;
    nodeContainer.appendChild(nameText);

    const metaParts = [];
    if (node.trader) metaParts.push(node.trader);
    const requirementCount = incomingCounts.get(node.id) || 0;
    if (requirementCount > 0) metaParts.push(`${requirementCount} prereq${requirementCount > 1 ? "s" : ""}`);
    if (node.kappa) metaParts.push("◆ Kappa");

    if (metaParts.length > 0) {
      const metaText = document.createElementNS(SVG_NS, "text");
      metaText.setAttribute("x", nodeWidth / 2);
      metaText.setAttribute("y", nodeHeight - 16);
      metaText.setAttribute("text-anchor", "middle");
      metaText.setAttribute("class", "node-meta");
      metaText.textContent = metaParts.join(" • ");
      nodeContainer.appendChild(metaText);
    }

    const title = document.createElementNS(SVG_NS, "title");
    const status = isCompleted ? "Completed" : "Incomplete";
    title.textContent = `${node.name} (${status})`;
    nodeContainer.appendChild(title);

    nodeGroup.appendChild(nodeContainer);
  });

  questTreeCanvas.appendChild(nodeGroup);
}

window.renderQuestTree = renderQuestTree;

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
  renderQuestTree();
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".quest")) {
    document.querySelectorAll(".quest-details").forEach((el) => el.classList.add("hidden"));
  }
});

render();
