// Content script for Gemini Assistant

let fab = null;

document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text) {
    showFAB(e.pageX, e.pageY, text);
  } else if (fab && !fab.contains(e.target)) {
    removeFAB();
  }
});

function showFAB(x, y, text) {
  removeFAB();

  fab = document.createElement('div');
  fab.className = 'gemini-fab';
  fab.style.left = `${x}px`;
  fab.style.top = `${y + 10}px`;

  const summarizeBtn = document.createElement('button');
  summarizeBtn.innerText = 'Summarize';
  summarizeBtn.onclick = () => {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_ACTION',
      action: 'summarize',
      text: text
    });
    removeFAB();
  };

  const rewriteBtn = document.createElement('button');
  rewriteBtn.innerText = 'Rewrite';
  rewriteBtn.onclick = () => {
    chrome.runtime.sendMessage({
      type: 'CONTEXT_ACTION',
      action: 'rewrite',
      text: text
    });
    removeFAB();
  };

  fab.appendChild(summarizeBtn);
  fab.appendChild(rewriteBtn);
  document.body.appendChild(fab);
}

function removeFAB() {
  if (fab) {
    fab.remove();
    fab = null;
  }
}

document.addEventListener('mousedown', (e) => {
  if (fab && !fab.contains(e.target)) {
    removeFAB();
  }
});
