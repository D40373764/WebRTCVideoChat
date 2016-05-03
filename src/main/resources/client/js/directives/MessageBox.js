mainApp.directive('messageBox', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'templates/message-box.html',
    link: function (scope, element) {

      function center(element) {
        //element.css('position', 'absolute').css('top', '40vh');      
      }

      center(element);
    }
  };
});