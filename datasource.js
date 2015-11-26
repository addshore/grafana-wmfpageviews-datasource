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
				var requestIndex = [];
				for (var i = 0; i < targets.length; i++) {
					var target = targets[i];

					var projects = target.project.split( '|' );
					var pages = target.page.split( '|' );

					for (var j = 0; j < projects.length; j++) {
						for (var k = 0; k < pages.length; k++) {

							requests.push( backendSrv.datasourceRequest( {
								method: 'GET',
								inspect: { type: 'wmpageviews' },
								url: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' +
								projects[j] + '/' +
								target.accesstype + '/' +
								target.agenttype + '/' +
								pages[k] +
								'/daily/' + self._toRestBaseString( queryOptions.range.from.valueOf() ) +
								'/' + self._toRestBaseString( queryOptions.range.to.valueOf() )
							} ) );

							requestIndex.push( { project: projects[j], page: pages[k], accesstype: target.accesstype, agenttype: target.agenttype } );

						}
					}

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
								requestIndex[index].project.replace( '.', '_' ) + '.' +
								requestIndex[index].page.replace( '.', '_' ) + '.' +
								requestIndex[index].accesstype.replace( '.', '_' ) + '.' +
								requestIndex[index].agenttype.replace( '.', '_' )
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
