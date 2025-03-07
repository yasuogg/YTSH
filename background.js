let authToken = null;
let isAuthenticating = false;

// Google Sheets API requests
async function checkVideoExists(sheetId, sheetName, videoId)  {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!E:E`;
  console.log(url);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const data = await response.json();
  return data.values?.flat().includes(videoId) || false;
  // 
  }

async function addToSheet(sheetId, sheetName, data) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:C1:append?valueInputOption=USER_ENTERED`;
  await fetch(url, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        values: [[
            data.link,        // Column A: Video URL
            data.duration,    // Column B: Duration
            data.comment,     // Column C: User Comment
            data.title,       // Column D: Video Title
            data.videoId      // Column E: Video ID
          ]]    
        
        })
  });
}

// Unified authentication handler
async function authenticate() {
    if (authToken && !isTokenExpired(authToken)) return;
    
    return new Promise((resolve, reject) => {
      if (isAuthenticating) {
        const interval = setInterval(() => {
          if (!isAuthenticating) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
        return;
      }
  
      isAuthenticating = true;
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        isAuthenticating = false;
        if (chrome.runtime.lastError) {
          console.error('Auth error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        authToken = token;
        chrome.storage.local.set({ authToken: token });
        resolve();
      });
    });
  }
  
  // Token validation check
  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
  
  // Initialize token from storage
  chrome.storage.local.get(['authToken'], (result) => {
    if (result.authToken) {
      authToken = result.authToken;
    }
  });
  
  // Revoke token on extension update
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'update') {
      chrome.identity.removeCachedAuthToken({ token: authToken });
      chrome.storage.local.remove('authToken');
      authToken = null;
    }
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        await authenticate();
        
        // Rest of your existing handler code
        const { sheetId, sheetName } = await chrome.storage.sync.get(['sheetId', 'sheetName']);
        
        if (request.action === 'CHECK_EXISTENCE') {
          const exists = await checkVideoExists(sheetId, sheetName, request.videoId);
          sendResponse({ exists });
        }
        
        if (request.action === 'ADD_TO_SHEET') {
          await addToSheet(sheetId, sheetName, request.data);
          sendResponse({ success: true }); // Ensure response is sent

        }
        
      } catch (error) {
        console.error('Auth failed:', error);
        chrome.storage.local.remove('authToken');
        authToken = null;
      }
    })();
    return true;
  });