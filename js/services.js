'use strict';

angular.module('elevatorSim.services', []).

service('Logger', ["$log", function($log) {
	this.logs = [];
	
	this.log = function(type, message) {
		$log.info(type + ": " + message);
		this.logs.push({ 
			timestamp: new Date().getTime(), 
			type: type,
			message: message 
		});
	};
	
	this.clearLogs = function() {
		this.logs.length = 0;
	};
}]).

factory('Simulation', ['Logger', 'Elevator', 'Floor', 'Passenger', 'Enums', 
	function(Logger, Elevator, Floor, Passenger, Enums) {
	
	var Simulation = function(settings) {
		this.init(settings);
    };
    
    Simulation.prototype.init = function(settings) {
    	if (!settings || !settings.numElevators || !settings.numFloors) {
    		return;
    	}
		
		makeElevators.call(this, settings.numElevators);
		makeFloors.call(this, settings.numFloors);
		resetPassengers.call(this);
		
		initFloorElevatorSlots.call(this);
		initElevatorPickupDropoffStops.call(this);
		
		var groundFloor = this.getFloorForLevel(1);
		if (groundFloor) {
			initElevatorCurrentFloor.call(this, groundFloor);
		}
		
		Logger.log("Simulation", "Initialized simulation with " + settings.numElevators 
			+ " elevators and " + settings.numFloors + " floors.");
    };
    
    Simulation.prototype.addPassenger = function(startLevel, destinationLevel) {
    	var startFloor = this.getFloorForLevel(startLevel);
    	var destinationFloor = this.getFloorForLevel(destinationLevel);
    	
    	if (startFloor && destinationFloor) {
    		var passenger = new Passenger(this.nextPassengerNum++, startFloor, destinationFloor);
			this.passengers.push(passenger);
			startFloor.passengersOnFloor[passenger.passengerNum] = passenger;
		
			Logger.log("Simulation", "Added passenger with start level " + startLevel
				+ " and destination level " + destinationLevel);
    	}
    };
    
    // Temporary function to run some code
    Simulation.prototype.testSomething = function() {
    	// This would usually be done by the passenger using mutex
    	var passenger = this.passengers[0];
    	var elevator = this.elevators[0];
    	delete passenger.currentFloor.passengersOnFloor[passenger.passengerNum];
    	passenger.currentFloor = null;
    	passenger.currentElevator = elevator;
    	elevator.passengersOnElevator[passenger.passengerNum] = passenger;
    	
    	elevator.doorMutex.claim();
    	elevator.elevatorState = Enums.ElevatorState.Open;
		elevator.direction = Enums.ElevatorDirection.Up;
		passenger.passengerState = Enums.PassengerState.WaitingForFloor;
    };
    
    Simulation.prototype.getFloorForLevel = function(level) {
    	var floorIndex = level - 1;
    	if (floorIndex >= 0 && floorIndex < this.floors.length) {
    		return this.floors[floorIndex];
    	} else {
    		return null;
    	}
    };
    
    function makeElevators(numElevators) {
    	this.elevators = this.elevators || [];
    	this.elevators.length = 0;
    	
    	for (var i=0; i < numElevators; i++) {
    		this.elevators.push(new Elevator(i));
    	}
    }
    
    function makeFloors(numFloors) {
    	this.floors = this.floors || [];
    	this.floors.length = 0;
    	
    	for (var i=0; i < numFloors; i++) {
    		this.floors.push(new Floor(i));
    	}
    }
    
    function resetPassengers() {
		this.passengers = this.passengers || [];
    	this.passengers.length = 0;
    	this.nextPassengerNum = 0;
    }
    
    function initFloorElevatorSlots() {
    	var numElevators = this.elevators.length;
    	for (var i=0; i < this.floors.length; i++) {
    		this.floors[i].initElevatorSlots(numElevators);
    	}
    }
    
    // floor must not be null
    function initElevatorCurrentFloor(floor) {
    	for (var i=0; i < this.elevators.length; i++) {
    		setElevatorOnFloor.call(this, this.elevators[i], floor);
    	}
    }
    
    function initElevatorPickupDropoffStops() {
    	var numFloors = this.floors.length;
    	for (var i=0; i < this.elevators.length; i++) {
    		this.elevators[i].initPickupDropoffStops(numFloors);
    	}
    }
    
    // elevator and floor must not be null
    // this might be moved to elevator state updater
    function setElevatorOnFloor(elevator, floor) {
    	// First remove elevator from old floor
    	if (elevator.currentFloor) {
    		elevator.currentFloor.setElevatorSlot(elevator.elevatorNum, null);
    	}
    	
    	// Then update elevator's current floor and add elevator to new floor
		elevator.currentFloor = floor;
		floor.setElevatorSlot(elevator.elevatorNum, elevator)
    }
    
	return Simulation;
}]).


factory('Enums', function(Logger) {
	return {
		ElevatorDirection: { 
			Stationary: "Stationary", 
			Up: "Up", 
			Down: "Down" 
		},
		ElevatorState: { 
			Open: "Open", 
			Closed: "Closed", 
			UpTowards: "Moving up towards floor", 
			DownTowards: "Moving down towards floor" 
		},
		PassengerState: { 
			JoiningSim: "Joining simulation", 
			WaitingForElevator: "Waiting for elevator", 
			EnteringElevator: "Entering elevator", 
			WaitingToEnterElevator: "Waiting to enter elevator", 
			WaitingForFloor: "Waiting for floor", 
			WaitingToExitElevator: "Waiting to exit elevator", 
			ExitingElevator: "Exiting elevator", 
			ReachedDestination: "Reached destination"
		}
	};
}).

// Mutex that represents the elevator's entrance to stop multiple people from getting on or off at the same time
factory('ElevatorMutex', ['Logger', function(Logger) {
	
	var ElevatorMutex = function() {
		this.claimed = false;
    };
    
    // Returns true if the mutex could be claimed, false if not
    ElevatorMutex.prototype.claim = function() {
    	if (this.claimed) {
    		return false;
    	} else {
    		this.claimed = true;
    		return true;
    	}
    };
    
    ElevatorMutex.prototype.release = function() {
    	this.claimed = false;
    };
    
	return ElevatorMutex;
}]).

factory('Elevator', ['Logger', 'Enums', 'ElevatorMutex', function(Logger, Enums, ElevatorMutex) {
	
	var Elevator = function(elevatorNum) {
		this.elevatorNum = elevatorNum;
		this.elevatorState = Enums.ElevatorState.Closed;
		this.doorMutex = new ElevatorMutex();
		this.currentFloor = null;
		this.direction = Enums.ElevatorDirection.Stationary;
		this.pickupStops = [];
		this.dropoffStops = [];
		this.passengersOnElevator = {};
    };
    
    Elevator.prototype.initPickupDropoffStops = function(numFloors) {
    	this.pickupStops.length = 0;
    	this.dropoffStops.length = 0;
    	for (var i=0; i < numFloors; i++) {
    		this.pickupStops.push(false);
    		this.dropoffStops.push(false);
    	}
    };
    
    // Probably temporary
    Elevator.prototype.passengersOnElevatorToString = function() {
    	var result = "[";
    	for (var passengerNum in this.passengersOnElevator) {
    		result += passengerNum + " ";
    	}
    	result += "]";
    	return result;
    };
    
	return Elevator;
}]).

factory('Floor', ['Logger', function(Logger) {
	
	var Floor = function(floorNum) {
		this.floorNum = floorNum; // floorNum is zero index, number 0 will be level 1
		this.upPressed = false;
		this.downPressed = false;
		this.passengersOnFloor = {};
		this.elevatorSlots = []; // Holds reference to elevator if it's on the floor, null otherwise
    };
    
    Floor.prototype.getLevel = function() {
    	return this.floorNum + 1;
    };
    
    Floor.prototype.initElevatorSlots = function(numElevators) {
    	this.elevatorSlots.length = 0;
    	for (var i=0; i < numElevators; i++) {
    		this.elevatorSlots.push(null);
    	}
    };
    
    Floor.prototype.setElevatorSlot = function(slotNumber, elevator) {
    	if (slotNumber >= 0 && slotNumber < this.elevatorSlots.length) {
    		this.elevatorSlots[slotNumber] = elevator;
    	}
    };
    
    // Probably temporary
    Floor.prototype.elevatorSlotsToString = function() {
    	var result = "[";
    	for (var i=0; i < this.elevatorSlots.length; i++) {
    		result += (this.elevatorSlots[i] ? this.elevatorSlots[i].elevatorNum : "-") + " ";
    	}
    	result += "]";
    	return result;
    };
    
    // Probably temporary
    Floor.prototype.passengersOnFloorToString = function() {
    	var result = "[";
    	for (var passengerNum in this.passengersOnFloor) {
    		result += passengerNum + " ";
    	}
    	result += "]";
    	return result;
    };
    
	return Floor;
}]).

factory('Passenger', ['Logger', 'Enums', function(Logger, Enums) {
	
	var Passenger = function(passengerNum, startFloor, destinationFloor) {
		this.passengerNum = passengerNum;
		this.startFloor = startFloor;
		this.destinationFloor = destinationFloor;
		this.passengerState = Enums.PassengerState.JoiningSim;
		this.startTime = new Date().getTime();
		this.endTime = null;
		this.currentFloor = startFloor;
		this.currentElevator = null;
    };
    
	return Passenger;
}]).

factory('Incrementer', ['$timeout', 'Logger', function($timeout, Logger) {
	
	var Incrementer = function(interval) {
		this.interval = interval;
		this.incrementing = 0;
		
		if (this.incrementing < 100) {
			var self = this;
			$timeout(function() {
				self.updateIncrementing();
			}, this.interval);
		}
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