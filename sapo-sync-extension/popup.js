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

let isSyncPaused = false;

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

// Load các cấu hình đã lưu
chrome.storage.local.get(
  ["backendUrl", "syncInterval", "logs", "sapoCatalogText", "isSyncPaused"],
  (result) => {
    backendUrlInput.value = result.backendUrl || "https://tra-thao-moc-sunbeleaf-production.up.railway.app";
    syncIntervalSelect.value = result.syncInterval || "15";
    isSyncPaused = !!result.isSyncPaused;
    
    updatePauseButtonUI();
    
    if (result.logs && Array.isArray(result.logs)) {
      updateLogsUI(result.logs);
    } else {
      logList.innerHTML = "<li>Chưa có lịch sử đồng bộ. Mở Sapo Go để bắt đầu.</li>";
    }

    if (result.sapoCatalogText) {
      btnShowCatalog.style.display = "block";
      txtSapoCatalog.value = result.sapoCatalogText;
    }
  }
);

// Bấm xem & copy danh mục Sapo
btnShowCatalog.addEventListener("click", () => {
  if (txtSapoCatalog.style.display === "none") {
    txtSapoCatalog.style.display = "block";
    btnShowCatalog.innerText = "Click lần nữa để Copy tất cả";
  } else {
    txtSapoCatalog.select();
    document.execCommand("copy");
    btnShowCatalog.innerText = "Đã copy vào bộ nhớ tạm! ✓";
    btnShowCatalog.style.backgroundColor = "#10b981";
    btnShowCatalog.style.color = "white";
    setTimeout(() => {
      btnShowCatalog.innerText = "Xem & Copy danh mục Sapo";
      btnShowCatalog.style.backgroundColor = "";
      btnShowCatalog.style.color = "";
      txtSapoCatalog.style.display = "none";
    }, 2000);
  }
});


// Nút lưu cấu hình
saveBtn.addEventListener("click", () => {
  const backendUrl = backendUrlInput.value.trim();
  const syncInterval = syncIntervalSelect.value;
  
  chrome.storage.local.set({ backendUrl, syncInterval }, () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      backendUrl,
      syncInterval,
      isSyncPaused
    }, (response) => {
      saveBtn.innerText = "Lưu thành công! ✓";
      saveBtn.style.backgroundColor = "#10b981";
      saveBtn.style.color = "white";
      
      addLog("Đã lưu cấu hình kết nối mới.");
      
      setTimeout(() => {
        saveBtn.innerText = "Lưu cấu hình";
        saveBtn.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
        saveBtn.style.color = "";
      }, 2000);
    });
  });
});

// Nút tạm dừng / tiếp tục đồng bộ
pauseBtn.addEventListener("click", () => {
  isSyncPaused = !isSyncPaused;
  chrome.storage.local.set({ isSyncPaused }, () => {
    chrome.runtime.sendMessage({
      action: "updateSettings",
      backendUrl: backendUrlInput.value.trim(),
      syncInterval: syncIntervalSelect.value,
      isSyncPaused: isSyncPaused
    }, (response) => {
      updatePauseButtonUI();
      addLog(isSyncPaused ? "Đã tạm dừng đồng bộ đơn hàng." : "Đã tiếp tục đồng bộ đơn hàng.");
    });
  });
});

// Nút kích hoạt đồng bộ thủ công ngay lập tức
syncBtn.addEventListener("click", () => {
  syncBtn.innerText = "Đang kiểm tra đơn...";
  chrome.runtime.sendMessage({ action: "triggerSync" }, (response) => {
    setTimeout(() => {
      syncBtn.innerText = "Đồng bộ ngay";
      addLog("Gửi yêu cầu quét đơn hàng Zalo.");
    }, 1200);
  });
});

syncProductsBtn.addEventListener("click", () => {
  if (!confirm("Hệ thống sẽ tạo mới tất cả các sản phẩm từ Zalo Mini App sang Sapo Go của bạn (mã SKU bắt đầu bằng 'zalominiapp-'). Bạn có chắc chắn muốn thực hiện?")) {
    return;
  }
  
  syncProductsBtn.innerText = "Đang tạo SP...";
  syncProductsBtn.disabled = true;
  
  chrome.runtime.sendMessage({ action: "syncProductsToSapo" }, (response) => {
    syncProductsBtn.disabled = false;
    syncProductsBtn.innerText = "Tạo sản phẩm Zalo -> Sapo";
    
    if (response && response.success) {
      alert(`Đã hoàn thành! Thành công: ${response.successCount}, Thất bại: ${response.failCount}. Hãy kiểm tra nhật ký hoạt động để xem chi tiết.`);
    } else {
      alert(`Lỗi đồng bộ sản phẩm: ${response ? response.error : "Không có phản hồi từ Extension"}`);
    }
  });
});

updateProductsBtn.addEventListener("click", () => {
  if (!confirm("Hệ thống sẽ cập nhật thông tin tất cả sản phẩm Zalo trùng SKU (tiền tố 'zalominiapp-') trên Sapo Go. Sản phẩm nào chưa có sẽ được tạo mới. Bạn có chắc chắn muốn thực hiện?")) {
    return;
  }
  
  updateProductsBtn.innerText = "Đang cập nhật...";
  updateProductsBtn.disabled = true;
  
  chrome.runtime.sendMessage({ action: "updateProductsToSapo" }, (response) => {
    updateProductsBtn.disabled = false;
    updateProductsBtn.innerText = "Cập nhật sản phẩm Zalo -> Sapo";
    
    if (response && response.success) {
      alert(`Đã hoàn thành! Đã cập nhật: ${response.updatedCount}, Tạo mới: ${response.createdCount}, Thất bại: ${response.failCount}. Hãy kiểm tra nhật ký hoạt động để xem chi tiết.`);
    } else {
      alert(`Lỗi cập nhật sản phẩm: ${response ? response.error : "Không có phản hồi từ Extension"}`);
    }
  });
});

function updateLogsUI(logs) {
  logList.innerHTML = "";
  if (logs.length === 0) {
    logList.innerHTML = "<li>Chưa có lịch sử đồng bộ.</li>";
    return;
  }
  logs.forEach(log => {
    const li = document.createElement("li");
    li.innerText = log;
    logList.appendChild(li);
  });
}

function addLog(message) {
  chrome.storage.local.get(["logs"], (result) => {
    const currentLogs = result.logs || [];
    const timestamp = new Date().toLocaleTimeString("vi-VN");
    currentLogs.unshift(`[${timestamp}] ${message}`);
    
    if (currentLogs.length > 20) currentLogs.pop();
    
    chrome.storage.local.set({ logs: currentLogs }, () => {
      updateLogsUI(currentLogs);
    });
  });
}
