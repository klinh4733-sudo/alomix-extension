document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);

function saveOptions() {
  const larkAppId = document.getElementById('larkAppId').value;
  const larkAppSecret = document.getElementById('larkAppSecret').value;
  const larkAppToken = document.getElementById('larkAppToken').value;
  const larkTableId = document.getElementById('larkTableId').value;
  const anousithToken = document.getElementById('anousithToken').value;


  chrome.storage.local.set({
    larkAppId,
    larkAppSecret,
    larkAppToken,
    larkTableId,
    anousithToken,
    anousithToken
  }, () => {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  });
}

function restoreOptions() {
  chrome.storage.local.get({
    larkAppId: '',
    larkAppSecret: '',
    larkAppToken: '',
    larkTableId: '',
    anousithToken: ''
  }, (items) => {
    document.getElementById('larkAppId').value = items.larkAppId;
    document.getElementById('larkAppSecret').value = items.larkAppSecret;
    document.getElementById('larkAppToken').value = items.larkAppToken;
    document.getElementById('larkTableId').value = items.larkTableId;
    document.getElementById('anousithToken').value = items.anousithToken;

  });
}
