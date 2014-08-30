'use strict';

angular.module('elevatorSim.services', []).

service('Logger', function() {
	this.logs = [];
	
	this.addLog = function(type, message) {
		this.logs.push({ 
			timestamp: new Date().getTime(), 
			type: type,
			message: message 
		});
	};
	
	this.clearLogs = function() {
		this.logs.length = 0;
	};
}).

factory('Incrementer', ['$timeout', 'Logger', function($timeout, Logger) {
	
	var Incrementer = function(interval) {
		this.interval = interval;
		this.incrementing = 0;
		
		var self = this;
		$timeout(function() {
			self.updateIncrementing();
		}, this.interval);
    };
    
    Incrementer.prototype.getStuff = function() {
    	return this.testParam + " " + this.testLocal;
    };
    
    Incrementer.prototype.updateIncrementing = function() {
    	this.incrementing++;
    	Logger.addLog("" + this.interval, "Incremented to " + this.incrementing);
    	
		var self = this;
		$timeout(function() {
			self.updateIncrementing();
		}, this.interval);
    };
    
	return Incrementer;
}]);