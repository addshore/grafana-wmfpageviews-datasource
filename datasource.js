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

			WMFPageViewsDatasource.prototype._toRestBaseString = function (value) {
				var date = new Date( value );
				return date.getFullYear()
					+ ('0' + (date.getMonth()+1)).slice(-2)
					+ ('0' + date.getDate()).slice(-2);
			};

			WMFPageViewsDatasource.prototype.query = function( queryOptions ) {
				var targets = queryOptions.targets;
				var self = this;

				var requests = [];
				for (var i = 0; i < targets.length; i++) {
					var target = targets[i];
					requests.push( backendSrv.datasourceRequest( {
						method: 'GET',
						inspect: { type: 'wmpageviews' },
						url: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' +
						target.project + '/' +
						target.accesstype + '/' +
						target.agenttype + '/' +
						target.page +
						'/daily/' + self._toRestBaseString( queryOptions.range.from.valueOf() ) +
						'/' + self._toRestBaseString( queryOptions.range.to.valueOf() )
					} ) );

				}

				return $q.all( requests ).then(function( result ){
					var returnData = [];

					result.forEach( function( element, index ) {
						var datapoints = [];

						if( !element || !element.data ) {
							// Do nothing
						} else {
							for( var i = 0; i < element.data.items.length; i++ ) {
								var item = element.data.items[ i ];
								// Get the timestamp
								var ms = item.timestamp.substring( 0, item.timestamp.length - 2 );
								ms = new Date( ms.substr( 0, 4 ) + ' ' + ms.substr( 4, 2 ) + ' ' + ms.substr( 6, 2 ) ).getTime();
								datapoints[ i ] = [ item.views, ms ]
							}
						}

						var metricName =
								targets[index].project.replace( '.', '_' ) + '.' +
								targets[index].page.replace( '.', '_' ) + '.' +
								targets[index].accesstype.replace( '.', '_' ) + '.' +
								targets[index].agenttype.replace( '.', '_' )
							;

						returnData.push( { datapoints: datapoints, target: metricName } )
					} );

					return { data: returnData };
				} );
			};

			WMFPageViewsDatasource.prototype.metricFindQuery = function() {
				return $q.when([]);
			};

			return WMFPageViewsDatasource;
		} ] );
	} );
