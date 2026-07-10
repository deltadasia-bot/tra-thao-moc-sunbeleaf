// background.js

let backendUrl = "https://tra-thao-moc-sunbeleaf-production.up.railway.app";
let syncInterval = 15; // seconds
let isSyncPaused = false; // Trạng thái tạm dừng đồng bộ đơn

// Load configurations
chrome.storage.local.get(["backendUrl", "syncInterval", "isSyncPaused"], (result) => {
  if (result.backendUrl) backendUrl = result.backendUrl;
  if (result.syncInterval) syncInterval = result.syncInterval;
  isSyncPaused = !!result.isSyncPaused;
  
  if (isSyncPaused) {
    chrome.action.setBadgeText({ text: "II" });
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
  }
  
  setupAlarm();
});

// Setup alarm for periodic polling
function setupAlarm() {
  chrome.alarms.clear("poll_orders", () => {
    chrome.alarms.create("poll_orders", { periodInMinutes: syncInterval / 60 });
  });
}

// Listen to alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "poll_orders") {
    checkAndSyncOrders();
    checkAndUpdateTracking();
  }
});

// Listen to messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSettings") {
    backendUrl = request.backendUrl || backendUrl;
    syncInterval = parseInt(request.syncInterval) || syncInterval;
    isSyncPaused = request.isSyncPaused !== undefined ? request.isSyncPaused : isSyncPaused;
    
    if (isSyncPaused) {
      chrome.action.setBadgeText({ text: "II" });
      chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
    
    setupAlarm();
    sendResponse({ success: true });
  } else if (request.action === "triggerSync") {
    checkAndSyncOrders();
    checkAndUpdateTracking();
    sendResponse({ success: true });
  } else if (request.action === "syncProductsToSapo") {
    syncProductsToSapo(false)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === "updateProductsToSapo") {
    syncProductsToSapo(true)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Helper to add log
function addLog(message) {
  chrome.storage.local.get(["logs"], (result) => {
    const logs = result.logs || [];
    const timestamp = new Date().toLocaleTimeString("vi-VN");
    logs.unshift(`[${timestamp}] ${message}`);
    if (logs.length > 20) logs.pop();
    chrome.storage.local.set({ logs });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (result) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          extensionError: chrome.runtime.lastError.message
        });
        return;
      }
      resolve(result || { success: true });
    });
  });
}

async function ensureContentScript(tabId) {
  const pingResult = await sendMessageToTab(tabId, { action: "ping" });
  if (pingResult?.success) return true;

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  const injectedPing = await sendMessageToTab(tabId, { action: "ping" });
  return Boolean(injectedPing?.success);
}

async function reportSapoFailure(order, error) {
  try {
    await fetch(`${backendUrl}/api/sapo/extension/failure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: order.id,
        error: String(error || "Khong ro loi tu Sapo")
      })
    });
  } catch (reportError) {
    addLog(`Khong ghi duoc loi Sapo cho ${order.orderCode}: ${reportError.message}`);
  }
}

// 1. Tạo đơn hàng tự động
async function checkAndSyncOrders() {
  if (isSyncPaused) return;
  try {
    const response = await fetch(`${backendUrl}/api/sapo/extension/pending`);
    if (!response.ok) {
      throw new Error(`Lỗi kết nối Backend (${response.status})`);
    }
    
    const data = await response.json();
    const pendingOrders = data.orders || [];
    
    if (pendingOrders.length === 0) {
      chrome.action.setBadgeText({ text: "" });
      return;
    }
    
    chrome.action.setBadgeText({ text: String(pendingOrders.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#f79008" }); // Cam
    
    const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
    if (tabs.length === 0) {
      console.log("[Sapo Sync] Không tìm thấy tab Sapo Go đang mở để đồng bộ.");
      return;
    }
    
    const activeTab = tabs[0];
    const contentReady = await ensureContentScript(activeTab.id);
    if (!contentReady) {
      throw new Error("Không thể kích hoạt content script trên tab Sapo. Hãy reload extension rồi mở lại tab Sapo.");
    }

    let failedCount = 0;
    for (const orderToSync of pendingOrders.slice(0, 5)) {
      const result = await sendMessageToTab(activeTab.id, {
        action: "syncOrder",
        order: orderToSync,
        backendUrl: backendUrl
      });

      if (!result?.success) {
        const errorMessage = result?.error || result?.extensionError || "Không rõ lỗi từ Sapo";
        addLog(`Lỗi đơn ${orderToSync.orderCode}: ${errorMessage}`);
        await reportSapoFailure(orderToSync, errorMessage);
        failedCount += 1;
        chrome.action.setBadgeText({ text: "ERR" });
        chrome.action.setBadgeBackgroundColor({ color: "#d8000c" });
        continue;
      }

      addLog(`Đã tạo đơn ${orderToSync.orderCode} trên Sapo #${result.sapoOrderId}`);
    }

    if (failedCount === 0) {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error("[Sapo Sync background] Lỗi checkAndSyncOrders:", error.message);
    addLog(`Lỗi kiểm tra đơn: ${error.message}`);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#d8000c" }); // Đỏ
  }
}

// 2. Đồng bộ ngược mã vận đơn từ Sapo về Zalo
async function checkAndUpdateTracking() {
  if (isSyncPaused) return;
  try {
    const response = await fetch(`${backendUrl}/api/sapo/extension/pending-tracking`);
    if (!response.ok) return;
    
    const data = await response.json();
    const ordersNeedingTracking = data.orders || [];
    
    if (ordersNeedingTracking.length === 0) return;
    
    const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    const contentReady = await ensureContentScript(activeTab.id);
    if (!contentReady) return;
    
    // Gửi yêu cầu truy vấn thông tin vận đơn cho từng đơn
    for (const order of ordersNeedingTracking) {
      await sendMessageToTab(activeTab.id, {
        action: "queryTracking",
        id: order.id,
        sapoOrderId: order.sapoOrderId,
        backendUrl: backendUrl
      });
    }
  } catch (error) {
    console.error("[Sapo Sync background] Lỗi checkAndUpdateTracking:", error.message);
  }
}

async function syncProductsToSapo(upsert = false) {
  const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
  if (tabs.length === 0) {
    throw new Error("Không tìm thấy tab Sapo Go đang mở để đồng bộ. Hãy mở trang Sapo Go và đăng nhập trước.");
  }
  
  const activeTab = tabs[0];
  const contentReady = await ensureContentScript(activeTab.id);
  if (!contentReady) {
    throw new Error("Không thể kích hoạt script trên tab Sapo Go.");
  }
  
  return await sendMessageToTab(activeTab.id, {
    action: "createProductsOnSapo",
    backendUrl: backendUrl,
    upsert: upsert
  });
}

