define([
        'angular',
        'lodash',
        'jquery',
        'app/core/config',
        'app/core/utils/datemath',
        './directives',
        './query_ctrl',
    ],
    function (angular) {
      'use strict';

      var module = angular.module('grafana.services');

      module.factory('WMFPageviewsDatasource', function($q, backendSrv, templateSrv) {

        function WMFPageviewsDatasource() {
        }

        WMFPageviewsDatasource.prototype.query = function(options) {
          var from = new Date( options.range.from.valueOf() );
          var to = new Date( options.range.to.valueOf() );
          //TODO get target from somewhere
          var target = "User%3AAddshore";

          var fromString = from.getFullYear()
              + ('0' + (from.getMonth()+1)).slice(-2)
              + ('0' + from.getDate()).slice(-2);
          var toString = to.getFullYear()
              + ('0' + (to.getMonth()+1)).slice(-2)
              + ('0' + to.getDate()).slice(-2);

          var reqOpts = {};
          reqOpts.method = 'GET';
          reqOpts.url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/wikidata.org/all-access/all-agents/' + target + '/daily/' + fromString + '/' + toString;
          reqOpts.inspect = { type: 'wmpageviews' };

          return backendSrv.datasourceRequest( reqOpts ).then( function( result ) {

            var datapoints = [];

            if( !result || !result.data ) {
              return [];
            }
            for( var i = 0; i < result.data.items.length; i++ ) {
              var item = result.data.items[ i ];
              // Get the timestamp
              var ms = item.timestamp.substring( 0, item.timestamp.length - 2 );
              ms = new Date( ms.substr( 0, 4 ) + ' ' + ms.substr( 4, 2 ) + ' ' + ms.substr( 6, 2 ) ).getTime();
              datapoints[ i ] = [ item.views, ms ]
            }

            return { data: [ { datapoints: datapoints, target: "User:Addshore" } ] };
          } );
        };

        WMFPageviewsDatasource.prototype.metricFindQuery = function() {
          return $q.when([]);
        };

        return WMFPageviewsDatasource;

      });

    });