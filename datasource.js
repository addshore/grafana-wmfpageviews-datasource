define( [
		'angular',
		'lodash',
		'./directives',
		'./query_ctrl'
	],
	function( angular, _ ) {
		'use strict';

		var module = angular.module( 'grafana.services' );

		module.factory( 'WMFPageViewsDatasource', [ '$q', '$http', 'backendSrv', 'templateSrv', function( $q, $http, backendSrv, templateSrv ) {
			function WMFPageViewsDatasource( datasource ) {
			}

			WMFPageViewsDatasource.prototype._toRestBaseString = function( value ) {
				var date = new Date( value );
				return date.getFullYear()
					+ ('0' + (date.getMonth() + 1)).slice( -2 )
					+ ('0' + date.getDate()).slice( -2 );
			};

			WMFPageViewsDatasource.prototype._accessTypesFromTarget = function( target ) {
				var accessTypes = [];
				if( target.hasOwnProperty( 'access' ) ) {
					if( target.access.hasOwnProperty( 'desktop' ) && target.access.desktop ) {
						accessTypes.push( 'desktop' );
					}
					if( target.access.hasOwnProperty( 'mobileapp' ) && target.access.mobileapp ) {
						accessTypes.push( 'mobile-app' );
					}
					if( target.access.hasOwnProperty( 'mobileweb' ) && target.access.mobileweb ) {
						accessTypes.push( 'mobile-web' );
					}
				}
				if( accessTypes == [] ) {
					accessTypes.push( 'all' );
				}
				return accessTypes;
			};

			WMFPageViewsDatasource.prototype._agentTypesFromTarget = function( target ) {
				var agentTypes = [];
				if( target.hasOwnProperty( 'agent' ) ) {
					if( target.agent.hasOwnProperty( 'user' ) && target.agent.user ) {
						agentTypes.push( 'user' );
					}
					if( target.agent.hasOwnProperty( 'spider' ) && target.agent.spider ) {
						agentTypes.push( 'spider' );
					}
					if( target.agent.hasOwnProperty( 'bot' ) && target.agent.bot ) {
						agentTypes.push( 'bot' );
					}
				}
				if( agentTypes == [] ) {
					agentTypes.push( 'all' );
				}
				return agentTypes;
			};

			WMFPageViewsDatasource.prototype._groupingsFromTarget = function( target ) {
				var groupings = [];
				if( target.hasOwnProperty( 'groupprojects' ) && target.groupprojects ) {
					groupings.push( 'project' );
				}
				if( target.hasOwnProperty( 'grouppages' ) && target.grouppages ) {
					groupings.push( 'page' );
				}
				if( target.hasOwnProperty( 'agent' ) && target.agent.hasOwnProperty( 'grouped' ) && target.agent.grouped ) {
					groupings.push( 'agent' );
				}
				if( target.hasOwnProperty( 'access' ) && target.access.hasOwnProperty( 'grouped' ) && target.access.grouped ) {
					groupings.push( 'access' );
				}
				return groupings;
			};

			/**
			 * Each target consists of:
			 *
			 *  page - "User:Addshore|User_talk:Addshore" as an example
			 *  grouppages - true (or not set)
			 *
			 *  project - "wikidata.org|en.wikipedia.org" as an example
			 *  groupprojects - true (or not set)
			 *
			 *  access - object
			 *      desktop - true (or not set)
			 *      mobileapp - true (or not set)
			 *      mobileweb - true (or not set)
			 *      grouped - true (or not set)
			 *
			 *  agent - object
			 *      user - true (or not set)
			 *      spider - true (or not set)
			 *      bot - true (or not set)
			 *      grouped - true (or not set)
			 *
			 * Returns an array of metrics with all requests needed for said metric:
			 * [
			 *  "views/wikidata.org/User:Addshore" : [
			 *      "http://requesturl/someurl/1" : requestPromise1,
			 *      "http://requesturl/someurl/2" : requestPromise2,
			 *  ]
			 * ]
			 */
			WMFPageViewsDatasource.prototype._getGroupedRequests = function( targets, queryOptions ) {
				var self = this;

				var groupedRequests = [];

				for( var x = 0; x < targets.length; x++ ) {
					var target = targets[ x ];
					var pages = target.page.split( '|' );
					var projects = target.project.split( '|' );
					var accessTypes = self._accessTypesFromTarget( target );
					var agentTypes = self._agentTypesFromTarget( target );
					var groupings = self._groupingsFromTarget( target );

					for( var i = 0; i < pages.length; i++ ) {
						for( var j = 0; j < projects.length; j++ ) {
							for( var k = 0; k < accessTypes.length; k++ ) {
								for( var l = 0; l < agentTypes.length; l++ ) {
									var url = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/' +
										projects[ j ] + '/' +
										accessTypes[ k ] + '/' +
										agentTypes[ l ] + '/' +
										pages[ i ] +
										'/daily/' + self._toRestBaseString( queryOptions.range.from.valueOf() ) +
										'/' + self._toRestBaseString( queryOptions.range.to.valueOf() );

									var request = backendSrv.datasourceRequest( {
										method: 'GET',
										inspect: { type: 'wmpageviews' },
										url: url
									} );

									var metricName = 'views';
									if( groupings.indexOf( 'project' ) == -1 ) {
										metricName = metricName + '/' + projects[ j ];
									}
									if( groupings.indexOf( 'page' ) == -1 ) {
										metricName = metricName + '/' + pages[ i ];
									}
									if( groupings.indexOf( 'access' ) == -1 ) {
										metricName = metricName + '/' + accessTypes[ k ];
									}
									if( groupings.indexOf( 'agent' ) == -1 ) {
										metricName = metricName + '/' + agentTypes[ l ];
									}

									if( !groupedRequests.hasOwnProperty( metricName ) ) {
										groupedRequests[ metricName ] = [];
									}

									if( !groupedRequests[metricName].hasOwnProperty( url ) ) {
										groupedRequests[ metricName ][url] = request;
									}
								}
							}
						}
					}

				}

				return groupedRequests;
			};

			WMFPageViewsDatasource.prototype.query = function( queryOptions ) {
				var self = this;

				// Metric name mapped to ALL requests to be included in that metric!
				var metrics = self._getGroupedRequests( queryOptions.targets, queryOptions );

				var metricPromises = [];

				//foreach metric
				for( var metricName in metrics ) {
					if( metrics.hasOwnProperty( metricName ) ) {

						metricPromises.push( $q( function( resolve, reject ) {
							var requests = [];
							for( var o in metrics[ metricName ] ) {
								if( metrics[ metricName ].hasOwnProperty( o ) ) {
									requests.push( metrics[ metricName ][ o ] );
								}
							}

							var dataPoints = [];
							//Wait for all request promises to complete and then do stuff
							$q.all(requests).then(function(data){

								for( var j = 0; j < data.length; j++ ) {
									var element = data[j];
									if( element && element.data ) {
										for( var i = 0; i < element.data.items.length; i++ ) {
											var item = element.data.items[ i ];

											var views = item.views;
											var ms = item.timestamp.substring( 0, item.timestamp.length - 2 );
											ms = new Date( ms.substr( 0, 4 ) + ' ' + ms.substr( 4, 2 ) + ' ' + ms.substr( 6, 2 ) ).getTime();

											if( ms in dataPoints ) {
												dataPoints[ ms ][ 0 ] = dataPoints[ ms ][ 0 ] + views;
											} else {
												dataPoints[ ms ] = [ views, ms ];
											}
										}
									}
								}

								var finalDataPoints = [];
								for( var o in dataPoints ) {
									finalDataPoints.push( dataPoints[ o ] );
								}

								finalDataPoints.sort( function(a,b){ return a[1] - b[1] } );

								resolve( { datapoints: finalDataPoints, target: metricName } );
							});

						} ) );

					}
				}

				return $q.all(metricPromises).then(function(data){
					return { data: data };
				} );

			};

			WMFPageViewsDatasource.prototype.metricFindQuery = function() {
				return $q.when( [] );
			};

			return WMFPageViewsDatasource;
		} ] );
	} );
