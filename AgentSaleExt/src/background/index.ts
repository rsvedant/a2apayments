/**
 * MCP Proxy - Handles MCP requests from content script to bypass CORS
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MCP_CALL') {
    // Make the fetch request from background script (no CORS restrictions)
    fetch(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.authorization
      },
      body: JSON.stringify(request.body)
    })
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    
    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

console.log('[MCP Proxy] Background script loaded');
