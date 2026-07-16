// popup.js

const backendUrlInput = document.getElementById("backendUrl");
const syncIntervalSelect = document.getElementById("syncInterval");
const saveBtn = document.getElementById("saveBtn");
const syncBtn = document.getElementById("syncBtn");
const pauseBtn = document.getElementById("pauseBtn");
const syncProductsBtn = document.getElementById("syncProductsBtn");
const updateProductsBtn = document.getElementById("updateProductsBtn");
const statusDot = document.getElementById("statusDot");
const logList = document.getElementById("logList");
const btnShowCatalog = document.getElementById("btnShowCatalog");
const txtSapoCatalog = document.getElementById("txtSapoCatalog");

const DEFAULT_BACKEND_URL = "https://tra-thao-moc-sunbeleaf-production.up.railway.app";
const REQUIRED_CONTENT_BUILD = "1.0.37";
const PING_ACTION = "pingSunbeleafSapoV137";
const PRODUCT_ACTION = "createProductsOnSapoV137";
let isSyncPaused = false;
let productSyncWatchdog = null;
let productSyncRunning = false;

const headerTitle = document.querySelector("h2");
if (headerTitle && chrome.runtime?.getManifest) {
  headerTitle.innerText = `Sunbeleaf Sapo Assistant v${chrome.runtime.getManifest().version}`;
}

function nowText() {
  return new Date().toLocaleTimeString("vi-VN");
}

function makeLog(message) {
  return `[${nowText()}] ${message}`;
}

function updateLogsUI(logs) {
  logList.innerHTML = "";
  if (!Array.isArray(logs) || logs.length === 0) {
    logList.innerHTML = "<li>Chua co lich su dong bo.</li>";
    return;
  }

  logs.forEach((log) => {
    const li = document.createElement("li");
    li.innerText = log;
    logList.appendChild(li);
  });
}

function setLogs(logs) {
  chrome.storage.local.set({ logs }, () => updateLogsUI(logs));
}

function addLog(message) {
  chrome.storage.local.get(["logs"], (result) => {
    const currentLogs = Array.isArray(result.logs) ? result.logs : [];
    const nextLogs = [makeLog(message), ...currentLogs].slice(0, 50);
    chrome.storage.local.set({ logs: nextLogs }, () => updateLogsUI(nextLogs));
  });
}

function resetProductButtons() {
  productSyncRunning = false;
  syncProductsBtn.disabled = false;
  syncProductsBtn.innerText = "Tạo sản phẩm Zalo -> Sapo";
  updateProductsBtn.disabled = false;
  updateProductsBtn.innerText = "Cập nhật sản phẩm Zalo -> Sapo";
  if (productSyncWatchdog) {
    clearTimeout(productSyncWatchdog);
    productSyncWatchdog = null;
  }
}

function startProductSyncWatchdog() {
  if (productSyncWatchdog) clearTimeout(productSyncWatchdog);
  productSyncWatchdog = setTimeout(() => {
    resetProductButtons();
    addLog("Da qua 15 phut cho phan hoi. Neu log Sapo van dang chay thi mo lai popup de xem tiep.");
  }, 15 * 60 * 1000);
}

function isProductSyncDoneLog(log) {
  const text = String(log || "");
  return (
    /Hoan tat|Background bao hoan tat|Thanh cong:|That bai|loi:|Background bao loi/i.test(text) ||
    /ho.{0,8}n t.{0,8}t/i.test(text) ||
    /th.{0,8}t b.{0,8}i/i.test(text)
  );
}

function reconcileProductButtonsFromLogs(logs = []) {
  if (productSyncRunning && Array.isArray(logs) && logs.some(isProductSyncDoneLog)) {
    resetProductButtons();
  }
}

function sendMessageToTab(tabId, message, timeoutMs = 900000) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({
        success: false,
        error: `Tab Sapo khong phan hoi sau ${Math.ceil(timeoutMs / 1000)} giay.`
      });
    }, timeoutMs);

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message
        });
        return;
      }

      resolve(response || {
        success: false,
        error: "Content script khong phan hoi action nay."
      });
    });
  });
}

async function ensureContentScript(tabId) {
  const ping = await sendMessageToTab(tabId, { action: PING_ACTION }, 3000);
  if (ping?.success && ping.build === REQUIRED_CONTENT_BUILD) return true;

  addLog(`Dang nap content script moi ${REQUIRED_CONTENT_BUILD} vao tab Sapo...`);
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  const injectedPing = await sendMessageToTab(tabId, { action: PING_ACTION }, 5000);
  if (injectedPing?.success && injectedPing.build === REQUIRED_CONTENT_BUILD) {
    return true;
  }

  throw new Error(`Content script moi khong phan hoi dung build. Phan hoi: ${JSON.stringify(injectedPing)}`);
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Qua thoi gian cho tab Sapo reload."));
    }, timeoutMs);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(true);
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function reloadSapoTab(tabId) {
  addLog("Dang reload tab Sapo de xoa content script cu...");
  await chrome.storage.local.remove(["sapoLocationId", "sapoLocationSource", "sapoLocationCapturedAt"]);
  const waiting = waitForTabComplete(tabId);
  await chrome.tabs.reload(tabId, { bypassCache: true });
  await waiting;
  await new Promise((resolve) => setTimeout(resolve, 2500));
  addLog("Tab Sapo da reload xong, dang nap content script moi.");
}

async function findReadySapoTab() {
  const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
  if (!tabs.length) {
    throw new Error("Khong tim thay tab Sapo Go dang mo. Hay mo trang Sapo va dang nhap truoc.");
  }

  const orderedTabs = [...tabs].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
  });

  let lastError = "";
  for (const tab of orderedTabs) {
    try {
      addLog(`Thu ket noi tab Sapo #${tab.id}: ${tab.url || ""}`);
      await reloadSapoTab(tab.id);
      if (await ensureContentScript(tab.id)) {
        addLog(`Da ket noi content script tren tab Sapo #${tab.id}.`);
        return tab;
      }
      lastError = `Tab #${tab.id} khong phan hoi ping.`;
    } catch (error) {
      lastError = error.message;
      addLog(`Khong ket noi duoc tab #${tab.id}: ${error.message}`);
    }
  }

  throw new Error(lastError || "Khong kich hoat duoc content script tren tab Sapo.");
}

async function runProductActionDirect(action, runningText) {
  if (productSyncRunning) {
    addLog("Dang co tac vu san pham dang chay, bo qua click lap.");
    return;
  }

  const isCreate = action === "syncProductsToSapo";
  productSyncRunning = true;
  syncProductsBtn.disabled = true;
  updateProductsBtn.disabled = true;
  if (isCreate) {
    syncProductsBtn.innerText = runningText;
  } else {
    updateProductsBtn.innerText = runningText;
  }

  const startLog = makeLog(`Popup da nhan click: ${isCreate ? "tao moi" : "cap nhat"} san pham Zalo -> Sapo.`);
  setLogs([startLog]);
  startProductSyncWatchdog();

  try {
    const backendUrl = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
    addLog("Popup dang tim tab Sapo de chay truc tiep, khong qua background.");
    const tab = await findReadySapoTab();
    addLog("Da gui lenh xu ly san pham vao content script Sapo.");

    const response = await sendMessageToTab(tab.id, {
      action: PRODUCT_ACTION,
      backendUrl,
      upsert: !isCreate
    }, 900000);

    if (response?.fallback === "csv" || response?.fallback === "xlsx") {
      addLog(response.autoImportSuccess
        ? `API Sapo bi treo, da tao XLSX va thu nap vao form Sapo: ${response.fileName || "khong ro ten file"}.`
        : `API Sapo bi treo, da tai XLSX import: ${response.fileName || "khong ro ten file"}. Can bam Nhap file tren Sapo.`);
    } else if (response?.success) {
      addLog(`Content script bao hoan tat. Thanh cong: ${response.successCount || 0}, loi: ${response.failCount || 0}.`);
    } else {
      addLog(`Content script bao loi: ${response?.error || "Khong ro loi."}`);
    }
  } catch (error) {
    addLog(`Loi chay truc tiep: ${error.message}`);
  } finally {
    resetProductButtons();
  }
}

function updatePauseButtonUI() {
  if (isSyncPaused) {
    pauseBtn.innerText = "Tiếp tục đồng bộ đơn";
    pauseBtn.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
    pauseBtn.style.borderColor = "rgba(16, 185, 129, 0.3)";
    pauseBtn.style.color = "#a7f3d0";
    statusDot.className = "status-dot error";
  } else {
    pauseBtn.innerText = "Tạm dừng đồng bộ đơn";
    pauseBtn.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
    pauseBtn.style.borderColor = "rgba(239, 68, 68, 0.3)";
    pauseBtn.style.color = "#fecaca";
    statusDot.className = "status-dot";
  }
}

function runProductAction(action, runningText) {
  runProductActionDirect(action, runningText);
}

chrome.storage.local.get(
  ["backendUrl", "syncInterval", "logs", "sapoCatalogText", "isSyncPaused"],
  (result) => {
    backendUrlInput.value = result.backendUrl || DEFAULT_BACKEND_URL;
    syncIntervalSelect.value = result.syncInterval || "15";
    isSyncPaused = !!result.isSyncPaused;
    updatePauseButtonUI();

    const logs = Array.isArray(result.logs) ? result.logs : [];
    updateLogsUI(logs);

    if (result.sapoCatalogText) {
      btnShowCatalog.style.display = "block";
      txtSapoCatalog.value = result.sapoCatalogText;
    }
  }
);

btnShowCatalog.addEventListener("click", () => {
  if (txtSapoCatalog.style.display === "none") {
    txtSapoCatalog.style.display = "block";
    btnShowCatalog.innerText = "Click lan nua de copy tat ca";
    return;
  }

  txtSapoCatalog.select();
  document.execCommand("copy");
  btnShowCatalog.innerText = "Da copy";
  btnShowCatalog.style.backgroundColor = "#10b981";
  btnShowCatalog.style.color = "white";
  setTimeout(() => {
    btnShowCatalog.innerText = "Xem & Copy danh muc Sapo";
    btnShowCatalog.style.backgroundColor = "";
    btnShowCatalog.style.color = "";
    txtSapoCatalog.style.display = "none";
  }, 2000);
});

saveBtn.addEventListener("click", () => {
  const backendUrl = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
  const syncInterval = syncIntervalSelect.value;

  chrome.storage.local.set({ backendUrl, syncInterval }, () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      backendUrl,
      syncInterval,
      isSyncPaused
    }, () => {
      saveBtn.innerText = "Da luu";
      saveBtn.style.backgroundColor = "#10b981";
      saveBtn.style.color = "white";
      addLog("Da luu cau hinh ket noi moi.");
      setTimeout(() => {
        saveBtn.innerText = "Luu cau hinh";
        saveBtn.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        saveBtn.style.color = "";
      }, 2000);
    });
  });
});

pauseBtn.addEventListener("click", () => {
  isSyncPaused = !isSyncPaused;
  chrome.storage.local.set({ isSyncPaused }, () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      backendUrl: backendUrlInput.value.trim() || DEFAULT_BACKEND_URL,
      syncInterval: syncIntervalSelect.value,
      isSyncPaused
    }, () => {
      updatePauseButtonUI();
      addLog(isSyncPaused ? "Da tam dung dong bo don hang." : "Da tiep tuc dong bo don hang.");
    });
  });
});

syncBtn.addEventListener("click", () => {
  syncBtn.innerText = "Dang kiem tra don...";
  addLog("Popup gui lenh quet don hang Zalo.");
  chrome.runtime.sendMessage({ action: "triggerSync" }, () => {
    setTimeout(() => {
      syncBtn.innerText = "Dong bo ngay";
    }, 1200);
  });
});

syncProductsBtn.addEventListener("click", () => {
  runProductAction("syncProductsToSapo", "Đang tạo SP...");
});

updateProductsBtn.addEventListener("click", () => {
  runProductAction("updateProductsToSapo", "Đang cập nhật...");
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.logs) {
    const logs = changes.logs.newValue || [];
    updateLogsUI(logs);
    reconcileProductButtonsFromLogs(logs);
  }
});

setInterval(() => {
  chrome.storage.local.get(["logs"], (result) => {
    reconcileProductButtonsFromLogs(result.logs || []);
  });
}, 3000);
