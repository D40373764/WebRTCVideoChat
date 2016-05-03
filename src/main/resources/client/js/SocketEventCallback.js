'use strict';

var myCallbacks = {};

myCallbacks.onOpen = function () {
  if (sessionStorage.isAdvisor === 'true') {
    screenController.advisorLogin(sessionStorage.username);
  }
}

myCallbacks.onCall = function (data) {
  console.log(data);
  screenController.setCallerID(data.callerId);
  updateMessage("Caller ID: " + data.callerId);
  $('.call-button').prop('disabled', true);
  $('.leave-button').prop('disabled', false);
}

myCallbacks.onOffer = function () {
  $('#spinner').addClass('hide');
  dispatchEvent("CONNECTION_READY", true, "");

  activeMenu(true);
}

myCallbacks.onScreenOffer = function (data) {
  screenController.onScreenOffer(data);
}

myCallbacks.onAnswer = function () {
  dispatchEvent("CONNECTION_READY", true, "Hello!");

  activeMenu(true);
}

myCallbacks.onLeave = function (data) {
  updateMessage(data.username + " left the call");
  console.log(data);
  screenController.closePeerConnection();
  screenController.closePeerScreenConnection();
  document.querySelector('#remoteVideo').src = '';
  document.querySelector('#remoteScreen').src = '';
  activeMenu(false);
  this.updateWaitingCallerCount(data);
}

myCallbacks.onError = function (error) {
  updateMessage(error);
}

myCallbacks.onJoin = function (data) {
  if (data.success === false) {
    updateMessage("Login unsuccessful, please try a different name.");
  } else {
    $('.call-list').hide();
    screenController.startVideoConnection(document.querySelector('#remoteVideo'));
    updateMessage("Join successful.");
    activeMenu(true);
    this.updateWaitingCallerCount(data);
  }
}

myCallbacks.showCallList = function (data) {
  console.log(data);
  $('.call-list').empty();

  for (var callerId in data.value) {
    var users = data.value[callerId];
    if (users.length == 1) {
      var hostname = callerId.substring(callerId.indexOf("-") + 1)
      var users = data.value[callerId];
      var item = $(".call-box > div").clone();
      item.find('button').attr("data-callerid", callerId);
      item.find('span').text(hostname);
      item.appendTo(".call-list");
    }
  }

  if (data.value.length == 0 || $(".call-list > .callout").length == 0) {
    updateMessage('No call <i class="fa fa-smile-o"></i>');
  }

  $('.call-list button').on('click', function () {
    var callerId = $(this).data('callerid');
    var username = sessionStorage.username;

    sessionStorage.callerId = callerId;
    screenController.joinCall(username, callerId);
  });

  $('.waitingCaller').text(data.waitingCallerCount);

}

myCallbacks.updateWaitingCallerCount = function (data) {
  $('.waitingCaller').text(data.waitingCallerCount);
}

myCallbacks.onDefault = function (data) {
  console.log(data);
}

myCallbacks.onReceiveMessageCallback = function (event) {
  if (Object.keys(window.fileInfo).length === 0) {
    console.log("Received message: " + event.data);
    var message = JSON.parse(event.data);
    switch (message.type) {
    case 'message':
      var received = document.querySelector('.received');
      received.innerHTML = "<label>" + message.username + ":</label><div class='incomingmessage'>" + message.data + "</div>" + received.innerHTML;
      received.scrollTop = received.scrollHeight;
      break;
    case 'file':
      window.fileInfo = message.data;
      break;
    default:
    }
  } else {
    onReceiveFileCallback(event.data);
  }
}

myCallbacks.onReceiveDataChannelStateChange = function () {
  //  var readyState = webRTC.receiveDataChannel.readyState;
  //  console.log('Data channel state is: ' + readyState);
}

myCallbacks.onSendDataChannelStateChange = function () {
  //  var readyState = webRTC.sendDataChannel.readyState;
  //  console.log('Data channel state is: ' + readyState);
}