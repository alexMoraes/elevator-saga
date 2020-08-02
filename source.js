{
    init: function(elevators, floors) {
        const floorQueue = floors.map(floor => ({ floorNum: floor.floorNum(), up: false, down: false }));
        
        const getDirection = (elevator, currentFloorNum) => {
            if(elevator.destinationQueue[0] === undefined || (elevator.destinationQueue[0] === currentFloorNum && elevator.destinationQueue[1] === undefined))
                return "stopped";
                
            let destination = elevator.destinationQueue[0] !== currentFloorNum ? elevator.destinationQueue[0] : elevator.destinationQueue[1];
            return destination > currentFloorNum ? "up" : "down";
        }
        
        const setIndicators = (elevator, currentFloorNum) => {
            const direction = getDirection(elevator, currentFloorNum);
            
            if(direction === "up"){
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
        };
        
        const sortDestinationQueue = elevator => {
            const currentFloor = elevator.currentFloor();
            const direction = getDirection(elevator, currentFloor);
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
            setIndicators(elevator, elevator.currentFloor());
            elevator.checkDestinationQueue();
        };
        
        const reschedule = (elevator, floorNum) => {
            if(!elevator.getPressedFloors().includes(floorNum)) {
                elevator.destinationQueue = elevator.destinationQueue.filter(destination => destination != floorNum);
                sortDestinationQueue(elevator);
                setIndicators(elevator, elevator.currentFloor());
                elevator.checkDestinationQueue();
            }
        }
        
        floors.forEach(floor => {
            floor.on("up_button_pressed", () => {
                floorQueue[floor.floorNum()].up = true;
            });
            floor.on("down_button_pressed", () => {
                floorQueue[floor.floorNum()].down = true;
            });
        });
        
        elevators.forEach((elevator, index) => {
            elevator.on("idle", () => {
                const currentFloor = elevator.currentFloor();
                const closestRequestedFloor = floorQueue.filter(floor => floor.up || floor.down).sort((b, a) => a.floorNum- b.floorNum)[0];
                if(closestRequestedFloor !== undefined) {
                    goToFloor(elevator, closestRequestedFloor.floorNum);

                    floorQueue[closestRequestedFloor.floorNum].up = false;
                    floorQueue[closestRequestedFloor.floorNum].down = false;
                }
                else {
                    goToFloor(elevator, currentFloor);
                }
            });
            
            elevator.on("floor_button_pressed", floorNum => {
                goToFloor(elevator, floorNum);
            })
            
            elevator.on("stopped_at_floor", floorNum => {
                setIndicators(elevator, floorNum);
                const direction = getDirection(elevator, floorNum);
                
                const floor = floorQueue[floorNum];

                if (direction !== "down") {
                    floorQueue[floorNum].up = false;
                }
                else if (direction !== "up") {
                    floorQueue[floorNum].down = false;
                }
            });
            
            elevator.on("passing_floor", (floorNum, direction) => {
                const capacity = elevator.maxPassengerCount();
                const loadFactor = elevator.loadFactor();
                const threshold = 0.7;
                if(loadFactor > threshold) {
                    return;
                }
                
                const d = getDirection(elevator, floorNum);
                const floor = floorQueue[floorNum];
                
                const canRespondUpRequest = floor.up && d !== "down";
                const canRespondDownRequest = floor.down && d !== "up";
                
                if(canRespondUpRequest || canRespondDownRequest) {
                    goToFloor(elevator, floorNum);
                    
                    if (canRespondUpRequest) {
                        floorQueue[floorNum].up = false;
                    }
                    else if (canRespondDownRequest) {
                        floorQueue[floorNum].down = false;
                    }
                }
                
                setIndicators(elevator, floorNum);
            });
        });
    },
    update: function(dt, elevators, floors) {
    }
}