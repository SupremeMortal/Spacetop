/** @type {{ getInstances, switchInstance, addInstance, removeInstance, onInstancesUpdated }} */
const SN = window.SidebarNative;

const DISCORD_COLORS = ["#5865f2"];
const PALETTE = [
    "#1abc9c", "#2ecc71", "#3498db", "#9b59b6", "#e91e63",
    "#f1c40f", "#e67e22", "#e74c3c", "#95a5a6", "#607d8b"
];

function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(hash) % PALETTE.length];
}

const DISCORD_SVG = `<svg width="28" height="20" viewBox="0 0 127.14 96.36" fill="white" xmlns="http://www.w3.org/2000/svg">
  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
</svg>`;

function buildIcon(instance) {
    if (instance.type === "discord") {
        const div = document.createElement("div");
        div.className = "instance-icon";
        div.style.background = "#5865f2";
        div.innerHTML = DISCORD_SVG;
        return div;
    }
    const div = document.createElement("div");
    div.className = "instance-icon";
    div.style.background = colorForName(instance.name);
    div.textContent = instance.name.charAt(0).toUpperCase();
    return div;
}

function buildItem(instance, activeId) {
    const li = document.createElement("li");
    li.className = "instance-item" + (instance.id === activeId ? " active" : "");
    li.dataset.id = instance.id;
    li.dataset.name = instance.name;

    const pill = document.createElement("div");
    pill.className = "instance-pill";

    const icon = buildIcon(instance);

    li.appendChild(pill);
    li.appendChild(icon);

    if (instance.type !== "discord") {
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";
        removeBtn.textContent = "×";
        removeBtn.title = "Remove " + instance.name;
        removeBtn.addEventListener("click", e => {
            e.stopPropagation();
            SN.removeInstance(instance.id);
        });
        li.appendChild(removeBtn);

        li.addEventListener("contextmenu", e => {
            e.preventDefault();
            li.classList.toggle("show-remove");
        });
    }

    li.addEventListener("click", () => SN.switchInstance(instance.id));
    return li;
}

function renderList(instances, activeId) {
    const list = document.getElementById("instances");
    list.innerHTML = "";

    const discordInstances = instances.filter(i => i.type === "discord");
    const customInstances = instances.filter(i => i.type !== "discord");

    for (const inst of discordInstances) {
        list.appendChild(buildItem(inst, activeId));
    }

    if (discordInstances.length > 0 && customInstances.length > 0) {
        const div = document.createElement("li");
        div.innerHTML = '<div class="divider"></div>';
        list.appendChild(div);
    }

    for (const inst of customInstances) {
        list.appendChild(buildItem(inst, activeId));
    }
}

async function init() {
    const { instances, activeId } = await SN.getInstances();
    renderList(instances, activeId);

    SN.onInstancesUpdated(({ instances: updated, activeId: newActiveId }) => {
        renderList(updated, newActiveId);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-btn").addEventListener("click", () => SN.openAddServerDialog());
    init();
});
