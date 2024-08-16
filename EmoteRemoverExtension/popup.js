let emoteList = []; // Initialize as an empty array

// Load the emote list from localStorage when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  const storedEmoteList = localStorage.getItem('emoteList');
  if (storedEmoteList) {
    try {
      emoteList = JSON.parse(storedEmoteList);
      if (!Array.isArray(emoteList)) {
        emoteList = []; // Ensure emoteList is an array
      }
    } catch (e) {
      emoteList = []; // In case of error, initialize as an empty array
    }
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
    emoteList.push(emoteName); // Add the emote name to the list
    saveEmoteList(); // Save the updated list
    updateEmoteList(); // Update the UI with the new list
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: monitorAndRemoveEmotes,
        args: [emoteList] // Pass the updated emote list
      });
    });
  }
  document.getElementById('emoteName').value = ''; // Clear the input field
});

document.getElementById('removeAllEmotes').addEventListener('click', () => {
  removeAllEmotes();
});

document.getElementById('restoreAllEmotes').addEventListener('click', () => {
  restoreAllEmotes();
});

document.getElementById('refreshButton').addEventListener('click', () => {
  refreshEverything();
});

function saveEmoteList() {
  localStorage.setItem('emoteList', JSON.stringify(emoteList)); // Save emote list to localStorage
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
  addRemoveListeners(); // Add click listeners to remove emotes
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

function refreshEverything() {
  // Clear emoteList, localStorage, and reset the UI
  emoteList = [];
  localStorage.clear();
  updateEmoteList();
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopAllObserversAndAllowNewEntries,
      args: []
    });
  });
}

function removeEmote(index) {
  const emoteName = emoteList[index];
  emoteList.splice(index, 1); // Remove the emote from the list
  saveEmoteList(); // Save the updated list
  updateEmoteList(); // Update the UI
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopMonitoringAndRestoreEmote,
      args: [emoteName] // Pass the emote to restore
    });
  });
}

function removeAllEmotes() {
  // Monitor and remove all chat entries with emotes
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: monitorAndRemoveAllChatEntriesWithEmotes,
      args: []
    });
  });
}

function restoreAllEmotes() {
  // Clear the emoteList, stop all observers, and allow new elements to display
  emoteList = [];
  saveEmoteList();
  updateEmoteList();
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: stopAllObserversAndAllowNewEntries,
      args: []
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

function monitorAndRemoveAllChatEntriesWithEmotes() {
  // Ensure only one observer is set up
  if (window._allChatEntriesObserver) {
    window._allChatEntriesObserver.disconnect();
  }

  window._removedElements = window._removedElements || [];

  function removeChatEntriesWithEmotes() {
    const chatEntries = document.querySelectorAll('.chat-entry');
    chatEntries.forEach(entry => {
      if (entry.querySelector('[data-emote-name]') && !window._removedElements.some(e => e.element === entry)) {
        window._removedElements.push({
          element: entry,
          parent: entry.parentNode,
          nextSibling: entry.nextSibling
        });
        entry.remove();
      }
    });
  }

  // Initial removal of any existing elements
  removeChatEntriesWithEmotes();

  // Set up a MutationObserver to monitor changes in the DOM
  window._allChatEntriesObserver = new MutationObserver(() => {
    removeChatEntriesWithEmotes();
  });

  // Observe changes to the document body and its descendants
  window._allChatEntriesObserver.observe(document.body, { childList: true, subtree: true });
}

function stopAllObserversAndAllowNewEntries() {
  // Disconnect all observers to stop removing new elements
  if (window._emoteObservers) {
    for (const observer in window._emoteObservers) {
      if (window._emoteObservers[observer]) {
        window._emoteObservers[observer].disconnect();
      }
    }
    window._emoteObservers = {};
  }

  if (window._allChatEntriesObserver) {
    window._allChatEntriesObserver.disconnect();
    window._allChatEntriesObserver = null;
  }
}
