mainApp.controller('MenuController', function ($rootScope, $scope, $window, WebRTCService) {
  console.log("This is MenuController");
  var DESKTOP_MEDIA = ['screen', 'window'];
  //var SIGNALING_SERVER_URL = 'wss://d40373764.dvuadmin.net:8543';

  $scope.signin = function (username, isAdvisor) {
    if (username === undefined || username.length === 0) {
      return;
    }
    $scope.isAdvisor = isAdvisor;
    $scope.signinFlag = true;
    $scope.username = username;
    sessionStorage.username = $scope.username;
    sessionStorage.isAdvisor = $scope.isAdvisor;
    screenController = WebRTCService.getScreenController(SIGNALING_SERVER_URL, myCallbacks);
    $scope.enableCamera();

    if (chrome.app.isInstalled) {
      document.querySelector('.install-app').style.display = 'none';
    }


    updateMessage("Welcome, " + username + "!");
  }

  $scope.muteFlag = false;
  $scope.muteMic = function () {
    $scope.muteFlag = !$scope.muteFlag;
    if ($scope.muteFlag) {
      document.querySelector('#localVideo').muted = true;
      $('.fa-microphone').removeClass('enable').addClass('disable');
    } else {
      document.querySelector('#localVideo').muted = false;
      $('.fa-microphone').removeClass('disable').addClass('enable');
    }
  }

  $scope.videoFlag = true;
  $scope.toggleVideo = function () {
    $scope.videoFlag = !$scope.videoFlag;
    screenController.toggleVideo();
    if ($scope.videoFlag) {
      $('.fa-video-camera').removeClass('disable').addClass('enable');
    } else {
      $('.fa-video-camera').removeClass('enable').addClass('disable');
    }
  }

  $scope.audioFlag = true;
  $scope.toggleAudio = function () {
    $scope.audioFlag = !$scope.audioFlag;
    screenController.toggleAudio();
    if ($scope.audioFlag) {
      $('.fa-microphone').removeClass('disable').addClass('enable');
    } else {
      $('.fa-microphone').removeClass('enable').addClass('disable');
    }
  }

  //  $scope.takePhoto = function () {
  //    var v = document.getElementById("localVideo");
  //    var c = document.getElementById("localCanvas");
  //    var s = document.getElementById("localScreenshot");
  //    v.style
  //    c.width = v.clientWidth;
  //    c.height = v.clientHeight;
  //
  //    var ctx = c.getContext("2d");
  //    ctx.drawImage(v, 0, 0);
  //    s.src = c.toDataURL('image/png');
  //  }

  $scope.enableCamera = function () {
    document.querySelector('#localVideo').style.display = 'block';
    screenController.enableCamera({
      audio: true,
      video: true
    }, document.querySelector('#localVideo'));
  }

  $scope.showCalls = function () {
    screenController.getCallerIDs(sessionStorage.username);
    $('.call-list').show().addClass('down-up');
    $('.call-list').get(0).addEventListener("animationend", function () {
      $('.call-list').removeClass('down-up')
    }, false);
  }

  $scope.makeCall = function () {
    $('#spinner').removeClass('hide');
    screenController.setRemoteVideo(document.querySelector('#remoteVideo'));
    screenController.setRemoteScreen(document.querySelector('#remoteScreen'));
    screenController.makeCall(sessionStorage.username);
    $('.call-button').prop('disabled', true);
    $('.leave-button').prop('disabled', false);
  }

  $scope.back = function () {
    delete localStorage.username;
    delete localStorage.isAdvisor;
    //    $scope.username = undefined;
    //    $scope.isAdvisor = undefined;
    //    $scope.signinFlag = undefined;
    //
    //    var localVideo = document.querySelector('#localVideo');
    //    localVideo.style.display = 'none';
    //    localVideo.src = null;    $scope.leaveCall();

    if (sessionStorage.getItem('enableBack')) {
      delete sessionStorage.enableBack;
      window.close();
    } else {
      $window.location.reload();
    }
  }

  $scope.leaveCall = function () {
    $scope.screenFlag = false;
    $scope.remoteVideoClass = 'full-size';
    screenController.leaveCall();
    document.querySelector('#remoteVideo').src = '';
    $('#remoteVideoBox').addClass('hide');
    $('#spinner').addClass('hide');
    reset();
    activeMenu(false);
  }

  // Chat Box
  $scope.chatFlag = false;
  $scope.triggerChatBox = function () {
    $scope.chatFlag = !$scope.chatFlag;

    if ($scope.chatFlag) {
      $('chat-box').css('width', '100%');
      $('.received > div').css('height', 'auto')
    } else {
      $('.received > div').css('height', '0')
      $('chat-box').css('width', '0');
    }
  }

  // File Box
  $scope.fileFlag = false;
  $scope.triggerFileBox = function () {
    console.log("File box trigger");
    $scope.fileFlag = !$scope.fileFlag;
    if ($scope.fileFlag) {
      $('file-box').css('right', '0');
    } else {
      $('file-box').css('right', '-100%');
    }
  }

  // Screen Box
  $scope.screenFlag = false;
  $scope.remoteVideoClass = 'full-size';
  $scope.triggerScreenBox = function () {
    console.log("Screen box trigger");
    $scope.screenFlag = !$scope.screenFlag;
    if ($scope.screenFlag) {
      $scope.remoteVideoClass = 'small-size';
    } else {
      $scope.remoteVideoClass = 'full-size';
    }
  }

  $scope.launchChromeApp = function () {
    document.querySelector('.sharescreen-button').disabled = true;

    var w = $window.open("https://mbldevapp1.dev.devry.edu:8543/videochat/launchapp", "", "width=10, height=10");
    //var w = $window.open("https://d40373764.dvuadmin.net/videochat/launchapp", "", "width=10, height=10");

    w.close();

    var count = 0;
    var connected = false;
    var waitInterval = 500;

    var interval = window.setInterval(function () {

      // The ID of the extension we want to talk to.
      // var editorExtensionId = "iigmfchpgiaigcpabhlpjndfcgpfgnom";
      var editorExtensionId = "jckpmgmamoebmablijggebgaanjliikd";
      

      // Make a simple request:
      chrome.runtime.sendMessage(editorExtensionId, {
          username: $scope.username,
          callerId: screenController.callerId
        },
        function (response) {

          if (connected === false && response === undefined) {
            console.log("Continue to wait");
          } else if (connected === false && response !== undefined) {
            console.log("ignore");
            connected = true;
            waitInterval = 1000;
          } else if (connected === true && response === undefined) {
            connected = false;
            window.clearInterval(interval);
            document.querySelector('.sharescreen-button').disabled = false;
          }
        }
      );
    }, waitInterval);
  }

  // Filter Box
  $scope.filterFlag = false;
  $scope.triggerFilterBox = function () {
    console.log("File box trigger");
    $scope.filterFlag = !$scope.filterFlag;
    if ($scope.filterFlag) {
      $('filter-box').css('width', '100%');
    } else {
      $('filter-box').css('width', '0');
    }
  }

  $scope.installApp = function () {
    console.log("Install App");
    chrome.webstore.install();
  }

  $scope.username = '';
  $scope.isAdvisor = false;
  $scope.signinFlag = false;

  $scope.init = function () {
    var username = localStorage.username;
    var isAdvisor = localStorage.isAdvisor;

    if (username && isAdvisor) {
      sessionStorage.setItem('enableBack', true);
      $scope.signin(username, isAdvisor.toString() == "true");
    }
  }
});