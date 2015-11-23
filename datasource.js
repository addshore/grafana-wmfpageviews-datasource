define( [
		'angular',
		'lodash',
		'./directives',
		'./query_ctrl',
	],
	function( angular, _ ) {
		'use strict';

		var module = angular.module( 'grafana.services' );

		module.factory( 'WMFPageViewsDatasource', [ '$q', '$http', 'backendSrv', 'templateSrv', function( $q, $http, backendSrv, templateSrv ) {
			function WMFPageViewsDatasource( datasource ) {
			}

			WMFPageViewsDatasource.prototype.query = function( queryOptions ) {
				var from = new Date( queryOptions.range.from.valueOf() );
				var to = new Date( queryOptions.range.to.valueOf() );

				// TODO allow using multiple targets
				var target = queryOptions.targets[ 0 ];

				var fromString = from.getFullYear()
					+ ('0' + (from.getMonth()+1)).slice(-2)
					+ ('0' + from.getDate()).slice(-2);
				var toString = to.getFullYear()
					+ ('0' + (to.getMonth()+1)).slice(-2)
					+ ('0' + to.getDate()).slice(-2);

				var reqOpts = {};
				reqOpts.method = 'GET';
				reqOpts.url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' + target.project + '/all-access/all-agents/' + target.page + '/daily/' + fromString + '/' + toString;
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

					return { data: [ { datapoints: datapoints, target: target.page + '@' + target.project } ] };
				} );
			};

			WMFPageViewsDatasource.prototype.metricFindQuery = function() {
				return $q.when([]);
			};

			return WMFPageViewsDatasource;
		} ] );
	} );
