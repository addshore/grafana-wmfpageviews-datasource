define([
  'angular',
],
function (angular) {
  'use strict';

  var module = angular.module('grafana.directives');

  module.directive('metricQueryEditorWMFPageviews', function() {
    return {controller: 'WMFPageviewsQueryCtrl', templateUrl: 'app/plugins/datasource/wmfpageviews/partials/query.editor.html'};
  });

});
