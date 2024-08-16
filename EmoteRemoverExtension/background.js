chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: monitorAndRemoveEmoteEntries
    });
  });
  
  function monitorAndRemoveEmoteEntries() {
    function removeEmoteEntries() {
      const emoteNames = ["PatrickBoo", "RishiBypass"];
      
      emoteNames.forEach(emoteName => {
        const elements = document.querySelectorAll(`[data-emote-name="${emoteName}"]`);
        elements.forEach(element => {
          const parent = element.closest('.chat-entry');
          if (parent) {
            parent.remove();
          }
        });
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
  }
  