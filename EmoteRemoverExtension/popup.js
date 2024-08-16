let emoteList = [];

// Load the emote list from localStorage when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  const storedEmoteList = localStorage.getItem('emoteList');
  if (storedEmoteList) {
    emoteList = JSON.parse(storedEmoteList);
    updateEmoteList();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: monitorAndRemoveEmotes,
        args: [emoteList]
      });
    });
  }
});

document.getElementById('addEmote').addEventListener('click', () => {
  const emoteName = document.getElementById('emoteName').value.trim();
  if (emoteName && !emoteList.includes(emoteName)) {
    emoteList.push(emoteName);
    saveEmoteList();
    updateEmoteList();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: monitorAndRemoveEmotes,
        args: [emoteList]
      });
    });
  }
  document.getElementById('emoteName').value = '';
});

function saveEmoteList() {
  localStorage.setItem('emoteList', JSON.stringify(emoteList));
}

function updateEmoteList() {
  const emoteListDiv = document.getElementById('emoteList');
  emoteListDiv.innerHTML = '';
  emoteList.forEach((emote, index) => {
    const emoteElement = document.createElement('div');
    emoteElement.className = 'emote-item';
    emoteElement.innerHTML = `<span>${emote}</span><span class="remove-link" data-index="${index}">Remove</span>`;
    emoteListDiv.appendChild(emoteElement);
  });
  addRemoveListeners();
}

function addRemoveListeners() {
  const removeLinks = document.querySelectorAll('.remove-link');
  removeLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      const index = event.target.getAttribute('data-index');
      removeEmote(index);
    });
  });
}

function removeEmote(index) {
  const emoteName = emoteList[index];
  emoteList.splice(index, 1);
  saveEmoteList();
  updateEmoteList();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopMonitoringAndRestoreEmote,
      args: [emoteName]
    });
  });
}

function monitorAndRemoveEmotes(emoteNames) {
  window._removedElements = window._removedElements || {};
  window._emoteObservers = window._emoteObservers || {};

  emoteNames.forEach(emoteName => {
    if (window._emoteObservers[emoteName]) {
      // If already observing this emote, skip setting up a new observer
      return;
    }

    function removeEmoteEntries() {
      const elements = document.querySelectorAll(`[data-emote-name="${emoteName}"]`);
      elements.forEach(element => {
        const parent = element.closest('.chat-entry');
        if (parent && !window._removedElements[emoteName]?.includes(parent)) {
          window._removedElements[emoteName] = window._removedElements[emoteName] || [];
          window._removedElements[emoteName].push(parent);
          parent.remove();
        }
      });
    }

    // Initial removal of any existing elements
    removeEmoteEntries();

    // Set up a MutationObserver to monitor changes in the DOM
    const observer = new MutationObserver(() => {
      removeEmoteEntries();
    });

    // Observe changes to the document body and its descendants
    observer.observe(document.body, { childList: true, subtree: true });

    window._emoteObservers[emoteName] = observer;
  });
}

function stopMonitoringAndRestoreEmote(emoteName) {
  if (window._emoteObservers && window._emoteObservers[emoteName]) {
    // Stop observing this emote
    window._emoteObservers[emoteName].disconnect();
    delete window._emoteObservers[emoteName];
  }

  if (window._removedElements && window._removedElements[emoteName]) {
    // Restore removed elements
    window._removedElements[emoteName].forEach(element => {
      if (element.parentNode) {
        element.parentNode.insertBefore(element, element.nextSibling);
      } else {
        document.body.appendChild(element);
      }
    });
    delete window._removedElements[emoteName];
  }
}
