'use strict';

angular.module('elevatorSim.filters', []).

filter('logType', function() {
	return function(input, type) {
		// Allow all if filtered type is null
		if (!type) {
			return input;
		}
		
		var filtered = [];
		angular.forEach(input, function(item) {
			if (item.type == type) {
				filtered.push(item);
			}
		});
		return filtered;
	};
});