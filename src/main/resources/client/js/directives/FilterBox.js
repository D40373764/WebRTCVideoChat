mainApp.directive('filterBox', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'templates/filter-box.html',
    link: function (scope, element) {
      scope.filter = function (filter) {
        document.querySelector('#remoteVideo').style.webkitFilter = filter;
      }
    }
  };
});