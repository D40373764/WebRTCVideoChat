'use strict';

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.msRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription || window.msRTCSessionDescription;
window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

function hasUserMedia() {
  return !!(navigator.getUserMedia);
}

function hasRTCPeerConnection() {
  return !!(window.RTCPeerConnection);
}

DeVry.WebRTCController = function (url, myCallbacks) {
  if (!(this instanceof DeVry.WebRTCController)) {
    return new DeVry.WebRTCController();
  }
  this.video = null;
  this.remoteVideo = null;
  this.remoteScreen = null;
  this.username = null;
  this.callerId = null;
  this.stream = null;
  this.peerConnection = null;
  this.peerScreenConnection = null;
  this.sendDataChannel = null;
  this.receiveDataChannel = null;
  this.iceServers = [{
    "url": "stun:127.0.0.1:9876"
  }];
  this.configuration = {
    "iceServers": this.iceServers
  };
  this.socket = new DeVry.SocketManager();

  this.socket.connect(url, this, myCallbacks);
  this.callbacks = myCallbacks;
}

DeVry.WebRTCController.prototype.enableCamera = function (screenConstraints, video) {
  this.video = video;

  if (hasUserMedia() && hasRTCPeerConnection()) {
    navigator.getUserMedia(screenConstraints, this.successCameraCallback.bind(this), this.errorCallback.bind(this));
  } else {
    this.dispatchEvent("enableCamera", false, "Your browser does not support WebRTC.");
  }
}

DeVry.WebRTCController.prototype.startVideoConnection = function (remoteVideo) {
  var self = this;

  this.setupPeerConnection(remoteVideo, function () {});

  self.peerConnection.createOffer(function (sessionDescription) {
    self.socket.send({
      type: "offer",
      channel: "video",
      offer: sessionDescription
    });
    self.peerConnection.setLocalDescription(sessionDescription);
  }, function (error) {
    self.dispatchEvent("createOffer", false, "Failed to create offer.");
  });

}

DeVry.WebRTCController.prototype.setRemoteVideo = function (remoteVideo) {
  this.remoteVideo = remoteVideo;
}

DeVry.WebRTCController.prototype.setRemoteScreen = function (remoteScreen) {
  this.remoteScreen = remoteScreen;
}

DeVry.WebRTCController.prototype.setupPeerConnection = function (remoteVideo, callback) {
  var self = this;

  self.remoteVideo = remoteVideo;

  self.peerConnection = new RTCPeerConnection(self.configuration);
  self.peerConnection.addStream(this.stream);

  self.peerConnection.onaddstream = function (e) {
    self.remoteVideo.src = window.URL.createObjectURL(e.stream);
  }

  self.peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      self.socket.send({
        type: "candidate",
        channel: "video",
        candidate: event.candidate
      });
      self.dispatchEvent("startVideoConnection", true, "");
    }
  }

  self.peerConnection.oniceconnectionstatechange = function (event) {
    console.log(event);
    if (self.peerConnection.iceConnectionState === 'closed') {
      console.log("Peer disconnected");
      self.dispatchEvent("close", true, "");
    }
  }

  self.peerConnection.ondatachannel = function (event) {
    console.log('Receive Channel Callback');
    var receiveDataChannel = event.channel;
    receiveDataChannel.onmessage = self.callbacks.onReceiveMessageCallback;
    receiveDataChannel.onopen = self.callbacks.onReceiveDataChannelStateChange;
    receiveDataChannel.onclose = self.callbacks.onReceiveDataChannelStateChange;
    self.receiveDataChannel = receiveDataChannel;
  }

  self.createDataChannel(document.querySelector('.received'));

  callback();
}

//DeVry.WebRTCController.prototype.setuppeerScreenConnection = function (stream) {
//  var self = this;
//  var peerConnection = new RTCPeerConnection(self.configuration);
//  peerConnection.addStream(stream);
//
//  peerConnection.onaddstream = function (e) {
//    self.remoteScreen.src = window.URL.createObjectURL(e.stream);
//  }
//
//  // Setup ice handling
//  peerConnection.onicecandidate = function (event) {
//    if (event.candidate) {
//      self.socket.send({
//        type: "candidate",
//        channel: "screen",
//        candidate: event.candidate
//      });
//    }
//  }
//
//  self.peerScreenConnection = peerConnection;
//}
//DeVry.WebRTCController.prototype.startScreenConnection = function (screenConstraints, video) {
//  this.video = video;
//
//  if (hasUserMedia() && hasRTCPeerConnection()) {
//    navigator.getUserMedia(screenConstraints, this.successScreenCallback.bind(this), this.errorCallback.bind(this));
//  } else {
//    this.dispatchEvent("startScreenConnection", false, "Your browser does not support WebRTC.");
//  }
//}
DeVry.WebRTCController.prototype.successCameraCallback = function (stream) {
  var self = this;
  self.stream = stream;
  self.video.src = URL.createObjectURL(stream);
  stream.onended = function () {
    self.dispatchEvent("enableCamera", true, "Video ended.");
  };

  // Microphone
  var audioContext = new AudioContext();
  var analyser = audioContext.createAnalyser();
  var microphone = audioContext.createMediaStreamSource(stream);
  var javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
  analyser.smoothingTimeConstant = 0.3;
  analyser.fftsize = 1024;
  microphone.connect(analyser);
  analyser.connect(javascriptNode);
  javascriptNode.connect(audioContext.destination);
  //  var canvasContext = document.querySelector(".volume").getContext("2d");
  //  javascriptNode.onaudioprocess = function (e) {
  //    var array = new Uint8Array(analyser.frequencyBinCount);
  //    analyser.getByteFrequencyData(array);
  //    var length = array.length;
  //
  //    if (length > 0) {
  //      var values = 0;
  //      for (var i = 0; i < length; i++) {
  //        values += array[i];
  //      }
  //      var average = values / length;
  //      canvasContext.clearRect(0, 0, 384, 20);
  //      canvasContext.fillStyle = 'red';
  //      canvasContext.fillRect(0, 0, average, 20);
  //    }
  //  }
  self.dispatchEvent("enableCamera", true, "");
}

//DeVry.WebRTCController.prototype.successScreenCallback = function (stream) {
//  this.screenStream = stream;
//  this.setuppeerScreenConnection(stream);
//}

DeVry.WebRTCController.prototype.errorCallback = function (error) {
  this.dispatchEvent("error", false, "getUserMedia error: ", error);
}

DeVry.WebRTCController.prototype.closePeerConnection = function () {
  if (this.peerConnection != null) {
    if (this.peerConnection.iceConnectionState !== "closed") {
      this.peerConnection.close();
    }
    this.peerConnection.onicecandidate = null;
    this.peerConnection.onaddstream = null;
    this.callerId = null;
    this.socket.callerId = null;
  }
}

DeVry.WebRTCController.prototype.closePeerScreenConnection = function () {
  if (this.peerScreenConnection != null) {
    if (this.peerScreenConnection.iceConnectionState !== "closed") {
      this.peerScreenConnection.close();
    }
    this.peerScreenConnection.onicecandidate = null;
    this.peerScreenConnection.onaddstream = null;
  }
}

DeVry.WebRTCController.prototype.dispatchEvent = function (type, success, message) {
  var event = new CustomEvent(
    "WEBRTC_EVENT", {
      detail: {
        type: type,
        success: success,
        message: message
      },
      bubbles: true,
      cancelable: true
    }
  );
  document.dispatchEvent(event);
}

DeVry.WebRTCController.prototype.getCallerIDs = function (username) {
  this.socket.getCallerIDs(username);
}

DeVry.WebRTCController.prototype.setCallerID = function (callerId) {
  this.socket.callerId = callerId;
}

DeVry.WebRTCController.prototype.makeCall = function (username) {
  this.socket.makeCall(username);
}

DeVry.WebRTCController.prototype.joinCall = function (username, callerId) {
  this.username = username;
  this.callerId = callerId;
  this.socket.joinCall(username, callerId);
}

DeVry.WebRTCController.prototype.leaveCall = function () {
  if (this.username && this.callerId) {
    this.socket.leaveCall(this.username, this.callerId);
    this.closePeerConnection();
    this.closePeerScreenConnection();
  }
}

DeVry.WebRTCController.prototype.onOffer = function (response) {
  var self = this;
  self.setupPeerConnection(this.remoteVideo, function () {
    self.peerConnection.setRemoteDescription(new RTCSessionDescription(response.offer));

    // todo
    //var video = document.querySelector('#remoteVideo');
    //video.style.width = video.videoWidth;

    self.peerConnection.createAnswer(function (answer) {
      self.peerConnection.setLocalDescription(answer);
      self.socket.send({
        type: "answer",
        channel: "video",
        answer: answer
      });
    }, function (error) {
      self.dispatchEvent("onOffer", false, "Failed to create answer: " + error);
    });
  });
}

DeVry.WebRTCController.prototype.onScreenOffer = function (response) {
  var self = this;
  var peerConnection = new RTCPeerConnection(self.configuration);

  peerConnection.onaddstream = function (e) {
    self.remoteScreen.src = window.URL.createObjectURL(e.stream);
  }

  // Setup ice handling
  peerConnection.onicecandidate = function (event) {
    if (event.candidate) {
      self.socket.send({
        type: "candidate",
        channel: "screen",
        candidate: event.candidate
      });
    }
  }

  peerConnection.setRemoteDescription(new RTCSessionDescription(response.offer));

  peerConnection.createAnswer(function (answer) {
    peerConnection.setLocalDescription(answer);
    self.socket.send({
      type: "answer",
      channel: "screen",
      answer: answer
    });
  }, function (error) {
    alert("Failed to create answer:" + error);
  });

  self.peerScreenConnection = peerConnection;
}


DeVry.WebRTCController.prototype.createDataChannel = function (received) {
  var dataChannelOptions = [{
    RtpDataChannels: true
  }];

  var sendDataChannel = this.peerConnection.createDataChannel("sendDataChannel", dataChannelOptions);

  sendDataChannel.onerror = function (error) {
    console.log("Data Channel Error: " + error);
  }

  sendDataChannel.onmessage = function (event) {
    console.log("Data Channel message: " + event.data);
    received.innerHTML += "recv: " + event.data + "<br/>";
    received.scrollTop = received.scrollHeight;
  }

  sendDataChannel.onopen = function () {
    console.log('sendDataChannel state is: ' + sendDataChannel.readyState);
  }

  sendDataChannel.onclose = function () {
    console.log('sendDataChannel state is: ' + sendDataChannel.readyState);
    reset();
  }

  this.sendDataChannel = sendDataChannel;

  console.log("Send Data Channel is ready");
}

DeVry.WebRTCController.prototype.toggleVideo = function () {
  this.stream.getVideoTracks()[0].enabled = !(this.stream.getVideoTracks()[0].enabled);
}

DeVry.WebRTCController.prototype.toggleAudio = function () {
  this.stream.getAudioTracks()[0].enabled = !(this.stream.getAudioTracks()[0].enabled);
}

DeVry.WebRTCController.prototype.advisorLogin = function (username) {
  this.socket.advisorLogin(username);
}