mainApp.directive('spinner', function ($window) {
  return {
    restrict: 'E',
    scope: {},
    template: "<i class='fa fa-spinner fa-spin'></i>",
    link: function (scope, element) {

      var w = angular.element($window);

      function center(element) {
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        var left = ww / 2 - 16;
        var top = wh / 2 - 16;
        element.css('position', 'absolute').css('top', top).css('left', left);
      }

      w.bind('resize', function () {
        center(element);
      });

      center(element);
    }
  };
});