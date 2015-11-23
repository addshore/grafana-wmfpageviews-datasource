define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorWmfpageviews', function() {
    return {controller: 'WmfpageviewsQueryCtrl', templateUrl: 'app/plugins/datasource/wmfpageviews/partials/query.editor.html'};
  });

   module.directive('metricQueryOptionsWmfpageviews', function() {
     return {templateUrl: 'app/plugins/datasource/wmfpageviews/partials/query.options.html'};
   });

});
