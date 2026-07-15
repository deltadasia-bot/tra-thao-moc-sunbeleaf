// background.js

let backendUrl = "https://tra-thao-moc-sunbeleaf-production.up.railway.app";
let syncInterval = 15; // seconds
let isCheckingOrders = false;
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
    // Bấm "Đồng bộ ngay" là lệnh thủ công: chạy cả khi đang tạm dừng và log chi tiết
    checkAndSyncOrders(true);
    checkAndUpdateTracking(true);
    sendResponse({ success: true });
  } else if (request.action === "sapoPageFetchInMainWorld") {
    executeSapoPageFetchInMainWorld(sender, request.fetchRequest)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({
        ok: false,
        status: 0,
        text: "",
        error: error.message || String(error)
      }));
    return true;
  } else if (request.action === "downloadSapoImportCsv") {
    const fileName = String(request.fileName || "sunbeleaf-zalo-products-sapo-import.csv").replace(/[\\/:*?"<>|]+/g, "-");
    const csv = String(request.csv || "");
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    chrome.downloads.download({
      url,
      filename: fileName,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse({ success: true, downloadId, fileName });
    });
    return true;
  } else if (request.action === "syncProductsToSapo") {
    addLog("Nhan lenh tu popup: tao san pham Zalo -> Sapo.");
    syncProductsToSapo(false)
      .then((result) => {
        addLog(`Hoan tat tao san pham. Thanh cong: ${result?.successCount || 0}, loi: ${result?.failCount || 0}.`);
        sendResponse(result);
      })
      .catch((error) => {
        addLog(`Loi tao san pham: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === "updateProductsToSapo") {
    addLog("Nhan lenh tu popup: cap nhat san pham Zalo -> Sapo.");
    syncProductsToSapo(true)
      .then((result) => {
        addLog(`Hoan tat cap nhat san pham. Cap nhat: ${result?.updatedCount || 0}, tao moi: ${result?.createdCount || 0}, loi: ${result?.failCount || 0}.`);
        sendResponse(result);
      })
      .catch((error) => {
        addLog(`Loi cap nhat san pham: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function executeSapoPageFetchInMainWorld(sender, fetchRequest) {
  const tabId = sender?.tab?.id;
  const frameId = typeof sender?.frameId === "number" ? sender.frameId : 0;
  if (!tabId) {
    throw new Error("Khong xac dinh duoc tab Sapo de chay MAIN world fetch.");
  }
  if (!fetchRequest?.url || !fetchRequest?.method) {
    throw new Error("Thieu thong tin request Sapo.");
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    world: "MAIN",
    func: async (request) => {
      const controller = new AbortController();
      let timer = null;
      const timeoutMs = request.timeoutMs || 15000;
      const timeoutResult = new Promise((resolve) => {
        timer = setTimeout(() => {
          try {
            controller.abort();
          } catch (_error) {}
          resolve({
            ok: false,
            status: 0,
            text: "",
            error: `Sapo fetch qua MAIN world qua ${Math.ceil(timeoutMs / 1000)} giay chua phan hoi.`
          });
        }, timeoutMs);
      });

      const fetchResult = (async () => {
        const response = await window.fetch(request.url, {
          method: request.method,
          credentials: "same-origin",
          headers: request.headers || {},
          body: typeof request.payload === "undefined" ? undefined : JSON.stringify(request.payload),
          signal: controller.signal
        });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          text,
          error: ""
        };
      })().catch((error) => ({
        ok: false,
        status: 0,
        text: "",
        error: error && error.message ? error.message : String(error)
      }));

      try {
        return await Promise.race([fetchResult, timeoutResult]);
      } catch (error) {
        return {
          ok: false,
          status: 0,
          text: "",
          error: error && error.message ? error.message : String(error)
        };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    args: [{
      url: fetchRequest.url,
      method: fetchRequest.method,
      headers: fetchRequest.headers || {},
      payload: fetchRequest.payload,
      timeoutMs: fetchRequest.timeoutMs || 15000
    }]
  });

  const result = results?.[0]?.result;
  if (!result) {
    throw new Error("MAIN world fetch khong tra ket qua.");
  }
  return result;
}

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

function sendMessageToTab(tabId, message, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      finish({
        success: false,
        extensionError: `Tab Sapo không phản hồi sau ${Math.ceil(timeoutMs / 1000)} giây.`
      });
    }, timeoutMs);

    chrome.tabs.sendMessage(tabId, message, (result) => {
      if (chrome.runtime.lastError) {
        finish({
          success: false,
          extensionError: chrome.runtime.lastError.message
        });
        return;
      }
      finish(result || { success: true });
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

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
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

// Khi content script không phản hồi (thường do tab Sapo mở từ trước khi
// extension được reload), reload tab đó rồi thử kích hoạt lại.
async function reactivateTabByReload(tab) {
  try {
    addLog(`Dang reload tab Sapo #${tab.id} de kich hoat lai content script...`);
    const waiting = waitForTabComplete(tab.id);
    await chrome.tabs.reload(tab.id, { bypassCache: true });
    await waiting;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (await ensureContentScript(tab.id)) {
      addLog(`Da kich hoat lai content script tren tab Sapo #${tab.id}.`);
      return true;
    }
  } catch (error) {
    addLog(`Reload tab Sapo #${tab.id} that bai: ${error.message}`);
  }
  return false;
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
// force = true khi bấm "Đồng bộ ngay": chạy cả khi tạm dừng và log rõ từng bước.
async function checkAndSyncOrders(force = false) {
  if (isSyncPaused && !force) return;
  if (isSyncPaused && force) {
    addLog("Dong bo tu dong dang tam dung - chay thu cong theo lenh Dong bo ngay.");
  }
  if (isCheckingOrders) {
    addLog("Bo qua lan quet moi vi extension dang dong bo don truoc do.");
    return;
  }
  isCheckingOrders = true;
  try {
    const response = await fetch(`${backendUrl}/api/sapo/extension/pending`);
    if (!response.ok) {
      throw new Error(`Lỗi kết nối Backend (${response.status})`);
    }

    const data = await response.json();
    const pendingOrders = data.orders || [];

    if (pendingOrders.length === 0) {
      chrome.action.setBadgeText({ text: "" });
      if (force) {
        addLog("Khong co don Zalo nao dang cho dong bo sang Sapo.");
      }
      isCheckingOrders = false;
      return;
    }

    if (force) {
      addLog(`Co ${pendingOrders.length} don Zalo dang cho dong bo sang Sapo.`);
    }

    chrome.action.setBadgeText({ text: String(pendingOrders.length) });
    chrome.action.setBadgeBackgroundColor({ color: "#f79008" }); // Cam

    const tabs = await chrome.tabs.query({ url: "https://*.mysapogo.com/admin*" });
    if (tabs.length === 0) {
      isCheckingOrders = false;
      console.log("[Sapo Sync] Không tìm thấy tab Sapo Go đang mở để đồng bộ.");
      if (force) {
        addLog("Khong tim thay tab Sapo Go dang mo. Hay mo va dang nhap Sapo roi bam lai.");
      }
      return;
    }
    
    const orderedTabs = [...tabs].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
    });

    let activeTab = null;
    for (const tab of orderedTabs) {
      try {
        if (await ensureContentScript(tab.id)) {
          activeTab = tab;
          break;
        }
      } catch (error) {
        addLog(`Khong kich hoat duoc tab Sapo #${tab.id}: ${error.message}`);
      }
    }

    // Không tab nào phản hồi: reload tab Sapo tốt nhất rồi thử lại một lần
    if (!activeTab && orderedTabs.length > 0) {
      if (await reactivateTabByReload(orderedTabs[0])) {
        activeTab = orderedTabs[0];
      }
    }

    if (!activeTab) {
      throw new Error("Không thể kích hoạt content script trên tab Sapo. Hãy reload extension rồi mở lại tab Sapo.");
    }

    let failedCount = 0;
    for (const orderToSync of pendingOrders.slice(0, 5)) {
      // Tạo đơn trên Sapo cần dò LocationId/source_id + gọi API nên có thể mất
      // vài chục giây; timeout mặc định 5s sẽ báo lỗi giả "Tab không phản hồi".
      const result = await sendMessageToTab(activeTab.id, {
        action: "syncOrder",
        order: orderToSync,
        backendUrl: backendUrl
      }, 180000);

      if (result?.busy) {
        addLog(`Tam hoan don ${orderToSync.orderCode}: tab Sapo dang xu ly don khac.`);
        continue;
      }

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
    isCheckingOrders = false;
  } catch (error) {
    console.error("[Sapo Sync background] Lỗi checkAndSyncOrders:", error.message);
    addLog(`Lỗi kiểm tra đơn: ${error.message}`);
    chrome.action.setBadgeText({ text: "ERR" });
    isCheckingOrders = false;
    chrome.action.setBadgeBackgroundColor({ color: "#d8000c" }); // Đỏ
  }
}

// 2. Đồng bộ ngược mã vận đơn từ Sapo về Zalo
async function checkAndUpdateTracking(force = false) {
  if (isSyncPaused && !force) return;
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
      }, 60000);
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
  
  addLog(`${upsert ? "Bắt đầu cập nhật" : "Bắt đầu tạo"} sản phẩm Zalo -> Sapo.`);

  const orderedTabs = [...tabs].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
  });

  let activeTab = null;
  for (const tab of orderedTabs) {
    try {
      if (await ensureContentScript(tab.id)) {
        activeTab = tab;
        break;
      }
    } catch (error) {
      addLog(`Không kích hoạt được tab Sapo #${tab.id}: ${error.message}`);
    }
  }

  if (!activeTab) {
    throw new Error("Không thể kích hoạt script mới trên bất kỳ tab Sapo Go nào. Hãy tải lại trang Sapo.");
  }

  const result = await sendMessageToTab(activeTab.id, {
    action: "createProductsOnSapo",
    backendUrl: backendUrl,
    upsert: upsert
  }, 900000);

  if (result?.extensionError) {
    throw new Error(result.extensionError);
  }
  return result;
}
