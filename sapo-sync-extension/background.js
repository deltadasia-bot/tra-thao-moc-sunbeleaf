// background.js

let backendUrl = "https://tra-thao-moc-sunbeleaf-production.up.railway.app";
let syncInterval = 15; // seconds

// Load configurations
chrome.storage.local.get(["backendUrl", "syncInterval"], (result) => {
  if (result.backendUrl) backendUrl = result.backendUrl;
  if (result.syncInterval) syncInterval = result.syncInterval;
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
    setupAlarm();
    sendResponse({ success: true });
  } else if (request.action === "triggerSync") {
    checkAndSyncOrders();
    checkAndUpdateTracking();
    sendResponse({ success: true });
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

// 1. Tạo đơn hàng tự động
async function checkAndSyncOrders() {
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
    const orderToSync = pendingOrders[0];
    
    chrome.tabs.sendMessage(activeTab.id, {
      action: "syncOrder",
      order: orderToSync,
      backendUrl: backendUrl
    });
  } catch (error) {
    console.error("[Sapo Sync background] Lỗi checkAndSyncOrders:", error.message);
    addLog(`Lỗi kiểm tra đơn: ${error.message}`);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#d8000c" }); // Đỏ
  }
}

// 2. Đồng bộ ngược mã vận đơn từ Sapo về Zalo
async function checkAndUpdateTracking() {
  try {
    const response = await fetch(`${backendUrl}/api/sapo/extension/pending-tracking`);
    if (!response.ok) return;
    
    const data = await response.json();
    const ordersNeedingTracking = data.orders || [];
    
    if (ordersNeedingTracking.length === 0) return;
    
    const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
    if (tabs.length === 0) return;
    
    const activeTab = tabs[0];
    
    // Gửi yêu cầu truy vấn thông tin vận đơn cho từng đơn
    for (const order of ordersNeedingTracking) {
      chrome.tabs.sendMessage(activeTab.id, {
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
