mainApp.directive('fileBox', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'templates/file-box.html',
    link: function (scope, element) {

      scope.sendFile = function () {
        var files = document.querySelector('#file').files;
        if (files.length > 0) {
          var file = files[0];
          screenController.sendDataChannel.send(JSON.stringify({
            type: 'file',
            data: {
              name: file.name,
              size: file.size
            }
          }));
          sendFile(file);
        }
      }

      scope.close = function () {
        document.querySelector('#download').style.display = 'none';
        document.querySelector('.closedownload').style.display = 'none';
      }

    }
  };
});

window.fileInfo = {};
var receiveBuffer = [];
var receivedSize = 0;
var downloadAnchor = document.querySelector('a#download');
var sendProgress = undefined;

function sendFile(file) {
  var sendProgress = document.querySelector('progress#sendProgress');
  sendProgress.style.visibility = 'visible';
  console.log('file is ' + [file.name, file.size, file.type, file.lastModifiedDate].join(' '));

  // Handle 0 size files.
  //statusMessage.textContent = '';
  //downloadAnchor.textContent = '';
  if (file.size === 0) {
    console.log("Content is empty");
    return;
  }

  sendProgress.max = file.size;
  var chunkSize = 16384;

  var sliceFile = function (offset) {
    var reader = new window.FileReader();

    reader.onload = (function () {
      return function (e) {
        screenController.sendDataChannel.send(e.target.result);
        if (file.size > offset + e.target.result.byteLength) {
          window.setTimeout(sliceFile, 0, offset + chunkSize);
        } else {
          sendProgress.style.visibility = 'hidden';
          updateMessage(file.name + " transfered");
        }
        sendProgress.value = offset + e.target.result.byteLength;
      };
    })(file);
    var slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };

  sliceFile(0);
}

function onReceiveFileCallback(data) {
  if (sendProgress === undefined) {
    sendProgress = document.querySelector('progress#sendProgress');
    sendProgress.max = fileInfo.size;
  }

  // trace('Received Message ' + event.data.byteLength);
  receiveBuffer.push(data);
  receivedSize += data.byteLength;

  sendProgress.value = receivedSize;

  // Signaling protocol told about the expected file size (and name, hash, etc).
  if (receivedSize === fileInfo.size) {
    var received = new window.Blob(receiveBuffer);
    receiveBuffer = [];

    var downloadAnchor = document.querySelector('a#download');
    downloadAnchor.href = URL.createObjectURL(received);
    downloadAnchor.download = fileInfo.name;
    downloadAnchor.textContent =
      'Click to download \'' + fileInfo.name + '\' (' + fileInfo.size + ' bytes)';
    downloadAnchor.style.display = 'inline-block';
    document.querySelector('.closedownload').style.display = 'inline-block';
    receivedSize = 0;
    window.fileInfo = {};
  }
}