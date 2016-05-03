mainApp.directive('chatBox', function () {
  return {
    restrict: 'E',
    scope: {
      username: "=username"
    },
    templateUrl: 'templates/chat-box.html',
    link: function (scope, element) {

      scope.send = function () {
        console.log('send chat message: ' + scope.chatMessage);

        var received = element.find('.received')[0];
        var message = {
          type: 'message',
          data: scope.chatMessage,
          username: scope.username
        };
        received.innerHTML = "<label>" + scope.username + ":</label><div class='outmessage'>" + scope.chatMessage + "</div>" + received.innerHTML;
        received.scrollTop = received.scrollHeight;
        screenController.sendDataChannel.send(JSON.stringify(message));

      }
    }
  };
});