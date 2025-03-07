let currentVideoId = null;
let currentModal = null; // ✅ Store modal reference

function handleVideoChange() {
  const newVideoId = new URLSearchParams(window.location.search).get('v');

  if (newVideoId && newVideoId !== currentVideoId) {
    currentVideoId = newVideoId;
    checkAndInject();
  }
}

function checkAndInject() {
  const videoId = currentVideoId;

  if (videoId) {
    chrome.runtime.sendMessage(
      { action: 'CHECK_EXISTENCE', videoId },
      (response) => {
        if (videoId === currentVideoId) {
          injectButton(videoId, response.exists);
        }
      }
    );
  }
}

new MutationObserver(handleVideoChange).observe(document.body, {
  childList: true,
  subtree: true
});

window.addEventListener('yt-navigate-finish', handleVideoChange);

chrome.runtime.onMessage.addListener((response) => {
  if (response.error === 'auth_needed') {
    alert('Please re-authenticate with Google');
    chrome.runtime.sendMessage({ action: 'FORCE_AUTH' });
  }
});

handleVideoChange();

function injectButton(videoId, exists) {
  const oldBtn = document.getElementById('sheetBtn');
  if (oldBtn) oldBtn.remove();

  const btn = document.createElement('button');
  btn.id = 'sheetBtn';
  btn.innerHTML = exists ? '✓' : '+';

  btn.style = `
    background: ${exists ? '#2e7d32' : '#cc0000'};
    border: none;
    border-radius: 12px;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    margin-left: 8px;
    opacity: 0.8;
    transition: opacity 0.2s;
  `;

  btn.onmouseenter = () => (btn.style.opacity = '1');
  btn.onmouseleave = () => (btn.style.opacity = '0.8');

  if (!exists) {
    btn.onclick = async () => {
      exists = true;

      if (currentModal) {
        closeModal();
      }

      const modal = document.createElement('div');
      modal.id = 'customModal';
      modal.style = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #282828;
        padding: 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 0 10px rgba(0,0,0,0.5);
        color: white;
      `;

      const videoTitle = document.querySelector('h1.style-scope.ytd-watch-metadata')?.innerText;
      const videoDuration = document.querySelector('.ytp-time-duration')?.innerText;
      const videoLink = `https://youtube.com/watch?v=${videoId}`;

      modal.innerHTML = `
        <h3 style="margin: 0 0 15px 0">Save to Sheet</h3>
        <div style="margin-bottom: 10px">
          <div>Title: ${videoTitle}</div>
          <div>Duration: ${videoDuration}</div>
        </div>
        <textarea id="commentInput" 
          placeholder="Add your comment..." 
          style="
            width: 300px;
            height: 80px;
            margin-bottom: 10px;
            padding: 8px;
            background: #404040;
            color: white;
            border: 1px solid #606060;
          "
        ></textarea>
        <div style="display: flex; gap: 10px; justify-content: flex-end">
          <button id="cancelBtn" style="padding: 8px 16px; background: #444;">Cancel</button>
          <button id="submitBtn" style="padding: 8px 16px; background: #3da56f;">Submit</button>
        </div>
      `;

      document.body.appendChild(modal);
      currentModal = modal;

      function closeModal() {
        if (currentModal) {
          currentModal.remove();
          currentModal = null;
        }

        // ✅ Remove ESC key event listener
        document.removeEventListener('keydown', escKeyHandler);
      }

      const escKeyHandler = (e) => {
        if (e.key === 'Escape') closeModal();
      };

      document.addEventListener('keydown', escKeyHandler);

      // ✅ Cancel Button Closes Modal
      modal.querySelector('#cancelBtn').addEventListener('click', closeModal);

      // ✅ Submit Button Closes Modal After Saving
      modal.querySelector('#submitBtn').addEventListener('click', async () => {
        const comment = document.getElementById('commentInput').value;

        btn.innerHTML = '✓';
        btn.style.background = '#2e7d32';
        btn.dataset.exists = 'true';
        btn.style.cursor = 'default';

        try {
          await chrome.runtime.sendMessage({
            action: 'ADD_TO_SHEET',
            data: {
              link: videoLink,
              duration: videoDuration,
              comment: comment,
              title: videoTitle,
              videoId: videoId 
            }
          });

          closeModal(); // ✅ Close modal after submission
        } catch (error) {
          console.error('Error:', error);
          btn.innerHTML = '!';
          btn.style.cursor = 'pointer';
        }
      });
    };
  }

  const durationContainer = document.querySelector('.ytp-time-display');
  if (durationContainer) {
    durationContainer.appendChild(btn);
  } else {
    console.warn('Duration container not found, retrying...');
    setTimeout(() => injectButton(videoId, exists), 1000);
  }
}
