mainApp.factory('WebRTCService', function ($rootScope, $window, $log) {
  var screenController = null;

  $window.onbeforeunload = function () {
    if (screenController != null) {
      screenController.leaveCall();
    }
  }

  return {
    getScreenController: function (url, myCallbacks) {
      screenController = screenController || new DeVry.WebRTCController(url, myCallbacks);
      return screenController;
    }
  };
});