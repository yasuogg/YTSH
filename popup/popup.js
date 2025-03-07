document.addEventListener("DOMContentLoaded", () => {
  const sheetIdInput = document.getElementById("sheetId");
  const sheetNameInput = document.getElementById("sheetName");
  const saveButton = document.getElementById("save");
  const statusMessage = document.getElementById("status");

  // Load saved settings
  chrome.storage.sync.get(["sheetId", "sheetName"], (data) => {
    if (data.sheetId) sheetIdInput.value = data.sheetId;
    if (data.sheetName) sheetNameInput.value = data.sheetName;
  });

  saveButton.addEventListener("click", () => {
    const sheetId = sheetIdInput.value.trim();
    const sheetName = sheetNameInput.value.trim();

    if (!sheetId || !sheetName) {
      showStatus("Please fill in both fields!", "error");
      return;
    }

    chrome.storage.sync.set({ sheetId, sheetName }, () => {
      showStatus("Settings saved successfully!", "success");
    });
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
  }
});
