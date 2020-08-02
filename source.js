{
    init: function(elevators, floors) {
        const floorQueue = []; // { floorNum: 0, direction: "up"/"down" }
        
        const addFloorToQueue = (floorNum, direction) => {
            if(!floorQueue.some(floor => floor.floorNum === floorNum && floor.direction === direction)) {
                floorQueue.push( {floorNum: floorNum, direction: direction });
            }
        }
        
        const getNextFromQueue = () => floorQueue[0];
        const getFromQueue = (floorNum, direction) => {
            const filterFunction = direction === "stopped" ?
                  floor => floor.floorNum === floorNum :
                  floor => floor.floorNum === floorNum && floor.direction === direction;
            
            const floorIndex = floorQueue.findIndex(filterFunction);
            if(floorIndex >= 0) {
                const foundFloor = floorQueue.splice(floorIndex, 1)[0];
                return foundFloor;
            }
            else {
                return null;
            }
        }
        
        const getDirection = (elevator, currentFloorNum) => {
            if(currentFloorNum === undefined)
                currentFloorNum = elevator.currentFloor();
            
            if(elevator.destinationQueue[0] === undefined || (elevator.destinationQueue[0] === currentFloorNum && elevator.destinationQueue[1] === undefined))
                return "stopped";

            let destination = elevator.destinationQueue[0] !== currentFloorNum ? elevator.destinationQueue[0] : elevator.destinationQueue[1];
            return destination > currentFloorNum ? "up" : "down";
        }
        
        const setIndicators = (elevator, direction) => {
            if(direction === "up") {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(false);
            }
            else if(direction === "down") {
                elevator.goingUpIndicator(false);
                elevator.goingDownIndicator(true);
            }
            else {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(true);
            }
        }

        const sortDestinationQueue = elevator => {
            const currentFloor = elevator.currentFloor();
            const direction = getDirection(elevator);
            const goingUp = direction === "up";
            const goingDown = direction === "down";

            const distanceMaxFloor = Math.max(...elevator.destinationQueue) - currentFloor;
            const distanceMinFloor = currentFloor - Math.min(...elevator.destinationQueue);

            const distanceUp = other => {
                const distance = other - currentFloor;
                return distance >= 0 ? distance : distanceMaxFloor - distance;
            }

            const distanceDown = other => {
                const distance = currentFloor - other;
                return distance >= 0 ? distance : distanceMinFloor - distance;
            }

            const sortUp = (a, b) => distanceUp(a) - distanceUp(b);
            const sortDown = (a, b) => distanceDown(a) - distanceDown(b);

            const sortFunction = goingUp ? sortUp : sortDown;

            elevator.destinationQueue = elevator.destinationQueue.sort(sortFunction);
        }

        const goToFloor = (elevator, floorNum) => {
            elevator.destinationQueue = elevator.destinationQueue.concat(floorNum);
            sortDestinationQueue(elevator);
            
            const direction = getDirection(elevator);
            setIndicators(elevator, direction);
            
            elevator.checkDestinationQueue();
        };
        
        const reschedule = elevator => {
            const direction = getDirection(elevator);
            const pressedFloors = elevator.getPressedFloors();
            const rescheduledQueue = elevator.destinationQueue.filter(floorNum => {
                if(pressedFloors.includes(floorNum))
                    return true;
                
                const filterFunction = direction === "stopped" ?
                      floor => floor.floorNum === floorNum :
                      floor => floor.floorNum === floorNum;
                if(floorQueue.some(filterFunction))
                    return true;
                
                return false;
            });
            
            console.log("[RESCHEDULE] direction: " + direction + "; destinationQueue: " + elevator.destinationQueue + "; rescheduledQueue: " + rescheduledQueue)
            elevator.destinationQueue = rescheduledQueue;
            
            elevator.checkDestinationQueue();
        }
        
        floors.forEach(floor => {
            floor.on("up_button_pressed", () => addFloorToQueue(floor.floorNum(), "up"));
            floor.on("down_button_pressed", () => addFloorToQueue(floor.floorNum(), "down"));
        });
        
        elevators.forEach(elevator => {
            elevator.on("idle", function() {
                const floor = getNextFromQueue();
                if(floor) {
                    goToFloor(elevator, floor.floorNum);
                }
                else {
                    goToFloor(elevator, elevator.currentFloor());
                }
            });
            
            elevator.on("floor_button_pressed", floorNum => {
                goToFloor(elevator, floorNum);
            });

            elevator.on("stopped_at_floor", floorNum => {
                const direction = getDirection(elevator, floorNum);
                setIndicators(elevator, direction);
                getFromQueue(floorNum, direction);
            });
            
            elevator.on("passing_floor", (floorNum, _) => {
                reschedule(elevator);
                
                const capacity = elevator.maxPassengerCount();
                const loadFactor = elevator.loadFactor();
                const threshold = 0.7;
                if(loadFactor > threshold) {
                    return;
                }

                const direction = getDirection(elevator, floorNum);
                const floor = getFromQueue(floorNum, direction);
                if(floor !== null) {
                    goToFloor(elevator, floor.floorNum);
                }

                setIndicators(elevator, direction);
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}